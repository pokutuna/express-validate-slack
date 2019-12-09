"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_errors_1 = __importDefault(require("http-errors"));
var crypto_1 = __importDefault(require("crypto"));
function isInFiveMinutes(timestamp, now) {
    var epoch = parseInt(timestamp, 10);
    return epoch < Math.floor(now.getTime() / 1000) - 60 * 5;
}
function hasRawBody(req) {
    return req.rawBody ? true : false;
}
function verifySlack(signingSecret) {
    if (!signingSecret)
        throw new Error("set signing secret to verify requests from Slack");
    return function (req, res, next) {
        var timestamp = req.header("X-Slack-Request-Timestamp");
        var signature = req.header("X-Slack-Signature");
        if (!timestamp || !signature) {
            return next(http_errors_1.default(400, "Not containing X-Slack- headers"));
        }
        if (!isInFiveMinutes(timestamp, new Date())) {
            return next(http_errors_1.default(400, "Outdated Slack request"));
        }
        var body = hasRawBody(req) ? req.rawBody : req.body;
        var hmac = crypto_1.default.createHmac("sha256", signingSecret);
        var _a = signature.split("="), version = _a[0], hash = _a[1];
        hmac.update(version + ":" + timestamp + ":" + body);
        var equal = crypto_1.default.timingSafeEqual(Buffer.from(hash || ""), Buffer.from(hmac.digest("hex")));
        if (!equal) {
            return next(http_errors_1.default(400, "X-Slack-Signature verification failed"));
        }
        next();
    };
}
exports.verifySlack = verifySlack;