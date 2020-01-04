import express from "express";
import request from "supertest";
import crypto from "crypto";
import verifySlack, { rawBodyKeeper } from "./index";

const app = express();
app.use(express.json({ verify: rawBodyKeeper }));
app.use(verifySlack("test"));
app.all("*", (_, res) => res.send("ok"));

test("without X-Slack headers", async () => {
  await request(app)
    .post("/")
    .send({ msg: "test" })
    .then(res => {
      expect(res.status).toBe(400);
      expect(res.text).toMatch("Not containing X-Slack headers");
    });
});

test("outdated request", async () => {
  const timestamp = Date.now() / 1000 - 60 * 5 - 1;
  await request(app)
    .post("/")
    .set("X-Slack-Request-Timestamp", timestamp.toString())
    .set("X-Slack-Signature", "hello")
    .send({ msg: "test" })
    .then(res => {
      expect(res.status).toBe(400);
      expect(res.text).toMatch("Outdated Slack request");
    });
});

test("verification failed", async () => {
  await request(app)
    .post("/")
    .set("X-Slack-Request-Timestamp", (Date.now() / 1000).toString())
    .set("X-Slack-Signature", `v1=${crypto.randomBytes(32).toString("hex")}`)
    .send({ msg: "test" })
    .then(res => {
      expect(res.status).toBe(400);
      expect(res.text).toMatch("X-Slack-Signature verification failed");
    });
});

test("without rawBody", async () => {
  const app = express();
  app.use(express.json());
  app.use(verifySlack("test"));
  app.all("*", (_, res) => res.send("ok"));

  await request(app)
    .post("/")
    .set("X-Slack-Request-Timestamp", (Date.now() / 1000).toString())
    .set("X-Slack-Signature", `v1=${crypto.randomBytes(32).toString("hex")}`)
    .send({ msg: "test" })
    .then(res => {
      expect(res.status).toBe(500);
      expect(res.text).toMatch("Message must be a Buffer");
    });
});

test("success", async () => {
  const hmac = crypto.createHmac("sha256", "test");
  const version = "v1";
  const timestamp = (Date.now() / 1000).toString();
  const message = { msg: "test" };
  hmac.update(`${version}:${timestamp}:${JSON.stringify(message)}`);

  const signature = `${version}=${hmac.digest("hex")}`;

  await request(app)
    .post("/")
    .set("X-Slack-Request-Timestamp", timestamp)
    .set("X-Slack-Signature", signature)
    .send(message)
    .then(res => {
      expect(res.status).toBe(200);
      expect(res.text).toMatch("ok");
    });
});
