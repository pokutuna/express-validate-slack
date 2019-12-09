import createError from "http-errors";
import crypto from "crypto";

import { Request, Response, NextFunction, RequestHandler } from "express";

function isInFiveMinutes(timestamp: string, now: Date): boolean {
  const epoch = parseInt(timestamp, 10);
  return epoch < Math.floor(now.getTime() / 1000) - 60 * 5;
}

interface WithRawBody extends Request {
  rawBody: Buffer;
}

function hasRawBody(req: Request): req is WithRawBody {
  return (req as any).rawBody ? true : false;
}

export default function verifySlack(signingSecret: string): RequestHandler {
  if (!signingSecret)
    throw new Error("set signing secret to verify requests from Slack");

  return (req: Request, res: Response, next: NextFunction) => {
    const timestamp = req.header("X-Slack-Request-Timestamp");
    const signature = req.header("X-Slack-Signature");
    if (!timestamp || !signature) {
      return next(createError(400, "Not containing X-Slack- headers"));
    }
    if (!isInFiveMinutes(timestamp, new Date())) {
      return next(createError(400, "Outdated Slack request"));
    }

    const body = hasRawBody(req) ? req.rawBody : req.body;
    const hmac = crypto.createHmac("sha256", signingSecret);
    const [version, hash] = signature.split("=");
    hmac.update(`${version}:${timestamp}:${body}`);

    const equal = crypto.timingSafeEqual(
      Buffer.from(hash || ""),
      Buffer.from(hmac.digest("hex"))
    );
    if (!equal) {
      return next(createError(400, "X-Slack-Signature verification failed"));
    }

    next();
  };
}
