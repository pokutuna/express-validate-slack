@pokutuna/express-validate-slack
===

[![Actions Status](https://github.com/pokutuna/express-validate-slack/workflows/test/badge.svg?branch=master)](https://github.com/pokutuna/express-validate-slack/actions) [![npm (scoped)](https://img.shields.io/npm/v/@pokutuna/express-validate-slack)](https://www.npmjs.com/package/@pokutuna/express-validate-slack)


A [express](https://github.com/expressjs/express) middleware to verify requests from Slack.

Based on [Verifying requests from Slack | Slack](https://api.slack.com/docs/verifying-requests-from-slack)


## Usage

```js
import express from "express";
import verifySlack from "express-validate-slack";

const app = express();

// 1. To keep original request body as `req.rawBody`.
// Verifying requests from Slack requires original message body,
// but almost all middlewares overwrite `req.body`.
//
// This middleware first checks req.rawBody,
// and use req.body if rawBody doesn't exist.
app.use(express.json({
  verify: (req, res, buf) => req.rawBody = buf
}));


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

This package is designed for Google Cloud Functions.

You don't need to keep `req.rawBody`(Step 1 in Usage) on it.

> The rawBody property contains the unparsed bytes of the request body.  
> [HTTP Functions  |  Cloud Functions Documentation  |  Google Cloud](https://cloud.google.com/functions/docs/writing/http?hl=en#handling_content_types)
