"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawBodyKeeper = void 0;
var http_errors_1 = __importDefault(require("http-errors"));
var crypto_1 = __importDefault(require("crypto"));
function isIn5Minutes(timestamp, now) {
    var epoch = parseInt(timestamp, 10);
    return Math.floor(now.getTime() / 1000) - 60 * 5 <= epoch;
}
function hasRawBody(req) {
    return req.rawBody ? true : false;
}
function rawBodyKeeper(req, res, buf) {
    req.rawBody = buf;
}
exports.rawBodyKeeper = rawBodyKeeper;
function _verifyMessage(signingSecret, requestSignature, timestamp, message) {
    var hmac = crypto_1.default.createHmac("sha256", signingSecret);
    var _a = requestSignature.split("="), version = _a[0], hash = _a[1];
    hmac.update("".concat(version, ":").concat(timestamp, ":").concat(message));
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(hash || ""), Buffer.from(hmac.digest("hex")));
    }
    catch (err) {
        return false;
    }
}
function verifySlack(signingSecret) {
    if (!signingSecret)
        throw new Error("set signing secret to verify requests from Slack");
    return function (req, res, next) {
        var timestamp = req.header("X-Slack-Request-Timestamp");
        var signature = req.header("X-Slack-Signature");
        if (!timestamp || !signature) {
            return next((0, http_errors_1.default)(400, "Not containing X-Slack headers", {
                timestamp: timestamp,
                signature: signature
            }));
        }
        var now = new Date();
        if (!isIn5Minutes(timestamp, now)) {
            return next((0, http_errors_1.default)(400, "Outdated Slack request", {
                timestamp: timestamp,
                now: now
            }));
        }
        var body = hasRawBody(req) ? req.rawBody : req.body;
        if (!(body instanceof Buffer)) {
            return next((0, http_errors_1.default)(500, "Message must be a Buffer"));
        }
        var valid = _verifyMessage(signingSecret, signature, timestamp, body);
        if (!valid) {
            return next((0, http_errors_1.default)(400, "X-Slack-Signature verification failed"));
        }
        next();
    };
}
exports.default = verifySlack;
