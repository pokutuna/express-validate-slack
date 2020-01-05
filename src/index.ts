import createError from "http-errors";
import crypto from "crypto";

import { Request, Response, NextFunction, RequestHandler } from "express";

function isIn5Minutes(timestamp: string, now: Date): boolean {
  const epoch = parseInt(timestamp, 10);
  return Math.floor(now.getTime() / 1000) - 60 * 5 <= epoch;
}

interface WithRawBody extends Request {
  rawBody: Buffer;
}

function hasRawBody(req: Request): req is WithRawBody {
  return (req as any).rawBody ? true : false;
}

export function rawBodyKeeper(req: Request, res: Response, buf: Buffer) {
  (req as WithRawBody).rawBody = buf;
}

function _verifyMessage(
  signingSecret: string,
  requestSignature: string,
  timestamp: string,
  message: Buffer
): boolean {
  const hmac = crypto.createHmac("sha256", signingSecret);
  const [version, hash] = requestSignature.split("=");
  hmac.update(`${version}:${timestamp}:${message}`);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash || ""),
      Buffer.from(hmac.digest("hex"))
    );
  } catch (err) {
    return false;
  }
}

export default function verifySlack(signingSecret: string): RequestHandler {
  if (!signingSecret)
    throw new Error("set signing secret to verify requests from Slack");

  return (req: Request, res: Response, next: NextFunction) => {
    const timestamp = req.header("X-Slack-Request-Timestamp");
    const signature = req.header("X-Slack-Signature");

    if (!timestamp || !signature) {
      return next(
        createError(400, "Not containing X-Slack headers", {
          timestamp,
          signature
        })
      );
    }

    const now = new Date();
    if (!isIn5Minutes(timestamp, now)) {
      return next(
        createError(400, "Outdated Slack request", {
          timestamp,
          now
        })
      );
    }

    const body = hasRawBody(req) ? req.rawBody : req.body;
    if (!(body instanceof Buffer)) {
      return next(createError(500, "Message must be a Buffer"));
    }

    const valid = _verifyMessage(signingSecret, signature, timestamp, body);
    if (!valid) {
      return next(createError(400, "X-Slack-Signature verification failed"));
    }

    next();
  };
}
