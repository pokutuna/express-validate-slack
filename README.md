express-validate-slack
===

A middleware to verify requests from Slack working on [Express](https://github.com/expressjs/express).

[Verifying requests from Slack | Slack](https://api.slack.com/docs/verifying-requests-from-slack)

## Usage

```js
import express from "express";
import verifySlack from "express-validate-slack";

const app = express();

// 1. To keep original request body as `req.rawBody`.
// Verifying requests from Slack requires original message, 
// but almost all middlewares parsing body overwrite `req.body`.
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

It doesn't need to keep `req.rawBody` on Google Cloud Functions.

> The rawBody property contains the unparsed bytes of the request body.
[HTTP Functions  |  Cloud Functions Documentation  |  Google Cloud](https://cloud.google.com/functions/docs/writing/http?hl=en#handling_content_types)
