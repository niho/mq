"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const logger_1 = require("./logger");
exports.connect = () => __awaiter(this, void 0, void 0, function* () {
    try {
        const connection = yield amqp.connect(process.env.AMQP_URL ? process.env.AMQP_URL : "amqp://localhost");
        return Promise.resolve({
            handle: consumeQueue(connection)
        });
    }
    catch (err) {
        logger_1.logger.error(err.stack ? err.stack : err.message);
        process.exit(1);
        throw err;
    }
});
class Message {
    constructor(channel, msg) {
        this.channel = channel;
        this.message = msg;
        this.properties = {
            headers: msg.properties.headers,
            replyTo: msg.properties.replyTo
        };
        try {
            this.body = deserialize(msg.content, msg.properties.contentType, msg.properties.contentEncoding);
        }
        catch (err) {
            logger_1.logger.warn("Failed to deserialize message.");
            this.body = msg.content;
        }
    }
    ack() {
        this.channel.ack(this.message);
    }
    nack() {
        this.channel.nack(this.message, false, true);
    }
    reject() {
        this.channel.reject(this.message);
    }
    reply(data, options) {
        if (this.message.properties.replyTo) {
            const contentType = getContentType(data, options);
            const payload = serialize(data, contentType);
            this.channel.sendToQueue(this.message.properties.replyTo, payload, {
                contentType,
                contentEncoding: "utf8",
                correlationId: this.message.properties.correlationId ||
                    this.message.properties.messageId,
                type: this.message.properties.type + ".reply",
                timestamp: Date.now()
            });
        }
        this.ack();
    }
}
const consumeQueue = (connection) => (queueName, handler) => __awaiter(this, void 0, void 0, function* () {
    try {
        const channel = yield connection.createChannel();
        yield channel.assertQueue(queueName);
        channel.prefetch(1);
        yield channel.consume(queueName, processMessage(channel, handler));
    }
    catch (err) {
        logger_1.logger.error(err.stack ? err.stack : err.message);
        throw err;
    }
});
const processMessage = (channel, handler) => (msg) => __awaiter(this, void 0, void 0, function* () {
    if (msg) {
        try {
            yield handler(new Message(channel, msg));
        }
        catch (err) {
            channel.nack(msg, false, true);
        }
    }
});
const serialize = (data, contentType) => {
    switch (contentType) {
        case "text/plain":
            return Buffer.from(data);
        case "application/json":
            return Buffer.from(JSON.stringify(data));
        default:
            return Buffer.from(data);
    }
};
const deserialize = (data, contentType, contentEncoding) => {
    switch (contentType) {
        case "text/plain":
            return data.toString(contentEncoding || "utf8");
        case "application/json":
            return JSON.parse(data.toString(contentEncoding || "utf8"));
        default:
            return data;
    }
};
const getContentType = (body, options) => {
    if (options && options.contentType) {
        return options.contentType;
    }
    else if (typeof body === "string") {
        return "text/plain";
    }
    else if (typeof body === "object" && !body.length) {
        return "application/json";
    }
    else {
        return "application/octet-stream";
    }
};
//# sourceMappingURL=amqp.js.map