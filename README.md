@pokutuna/express-validate-slack
===

[![Actions Status](https://github.com/pokutuna/express-validate-slack/workflows/test/badge.svg?branch=master)](https://github.com/pokutuna/express-validate-slack/actions) [![npm (scoped)](https://img.shields.io/npm/v/@pokutuna/express-validate-slack)](https://www.npmjs.com/package/@pokutuna/express-validate-slack)


A [express](https://github.com/expressjs/express) middleware to verify requests from Slack.

Based on [Verifying requests from Slack | Slack](https://api.slack.com/docs/verifying-requests-from-slack)


## Usage

```js
import express from "express";
import verifySlack, { rawBodyKeeper } from "express-validate-slack";

const app = express();

// 1. To keep original request body as `req.rawBody`.
// Almost all middlewares & frameworks replace `req.body`.
// Verifying requests from Slack requires original body.
//
// This middleware first checks req.rawBody,
// and use req.body if rawBody doesn't exist.
app.use(express.json({ verify: rawBodyKeeper }));


// 2. Enable this middleware
app.use(verifySlack("<SLACK_SIGNING_SECRET>"));

// or enable this at a mount point.
// see https://expressjs.com/en/guide/using-middleware.html
app.post(
  "/slack/slash-command",
  verifySlack("<SLACK_SIGNING_SECRET>"),
  (req, res) => {
    ...
  }
);
```

### Appendix

#### Cloud Functions

This package is designed for Google Cloud Functions.

You don't need to keep `req.rawBody`(Step 1 in Usage) when receiving reqeusts on Cloud Functions.

> The rawBody property contains the unparsed bytes of the request body.  
> [HTTP Functions  |  Cloud Functions Documentation  |  Google Cloud](https://cloud.google.com/functions/docs/writing/http?hl=en#handling_content_types)


#### Next.js

To use this with Next.js in API Routes, do the following.

[API Routes: API Middlewares | Next.js](https://nextjs.org/docs/api-routes/api-middlewares)

In `pages/api/slack.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import type express from "express";
import bodyParser from "body-parser";
import validateSlack, { rawBodyKeeper } from "@pokutuna/express-validate-slack";

export const config = {
  api: {
    bodyParser: false,
  },
};

// runMiddleware from Next.js document
// https://nextjs.org/docs/api-routes/api-middlewares#connectexpress-middleware-support
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: express.RequestHandler) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, bodyParser.json({ verify: rawBodyKeeper }));
  await runMiddleware(req, res, validateSlack("<SLACK_SIGNING_SECRET>"));

  // access parsed body
  console.log(req.body.type);

  res.status(200).json({/* ... */});
}
```
