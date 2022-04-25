import createError from "http-errors";
import crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { NextFunction } from "express";

interface IncomingMessageWithBody extends IncomingMessage {
  body: any;
}

interface IncomingMessageWithRawBody extends IncomingMessageWithBody {
  rawBody: Buffer;
}

interface GenericRequestHandler {
  (req: IncomingMessageWithBody, res: ServerResponse, next: NextFunction): void;
}

function isIn5Minutes(timestamp: string, now: Date): boolean {
  const epoch = parseInt(timestamp, 10);
  return Math.floor(now.getTime() / 1000) - 60 * 5 <= epoch;
}

function hasRawBody(req: IncomingMessage): req is IncomingMessageWithRawBody {
  return (req as any).rawBody ? true : false;
}

/**
 * Keep original body to req.RawBody for bodyParser.json()
 * You don't need call this function directly, pass it to bodyParser.json().
 * Usage.
 *   app.use(bodyParser.json({ verify: rawBodyKeeper }))
 */
export function rawBodyKeeper(
  req: IncomingMessage,
  res: ServerResponse,
  buf: Buffer
) {
  (req as IncomingMessageWithRawBody).rawBody = buf;
}

/**
 * Verify request body from slack manually
 * see {@link https://api.slack.com/authentication/verifying-requests-from-slack}
 */
export function verifyMessage(
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

function head(input: string[] | string | undefined): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input) && input.length > 0) {
    return input[0];
  }
  return undefined;
}

/**
 * Returns a middleware that validates requests from Slack
 * This expects req.rawBody to be a Buffer having original request body.
 */
export default function verifySlack(
  signingSecret: string
): GenericRequestHandler {
  if (!signingSecret)
    throw new Error("set signing secret to verify requests from Slack");

  return (
    req: IncomingMessageWithBody,
    res: ServerResponse,
    next: NextFunction
  ) => {
    const timestamp = head(req.headers["x-slack-request-timestamp"]);
    const signature = head(req.headers["x-slack-signature"]);

    if (!timestamp || !signature) {
      return next(
        createError(400, "Not containing X-Slack headers", {
          timestamp,
          signature,
        })
      );
    }

    const now = new Date();
    if (!isIn5Minutes(timestamp, now)) {
      return next(
        createError(400, "Outdated Slack request", {
          timestamp,
          now,
        })
      );
    }

    const body = hasRawBody(req) ? req.rawBody : req.body;
    if (!(body instanceof Buffer)) {
      return next(createError(500, "Message must be a Buffer"));
    }

    const valid = verifyMessage(signingSecret, signature, timestamp, body);
    if (!valid) {
      return next(createError(400, "X-Slack-Signature verification failed"));
    }

    next();
  };
}
