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
const AWS = require("aws-sdk");
const logger_1 = require("./logger");
const sqs = new AWS.SQS();
class Message {
    constructor(queueUrl, msg) {
        this.queueUrl = queueUrl;
        this.message = msg;
        this.headers = msg.MessageAttributes ? headers(msg.MessageAttributes) : [];
        try {
            this.body = msg.Body ? JSON.parse(msg.Body) : undefined;
        }
        catch (err) {
            this.body = msg.Body;
        }
    }
    ack() {
        if (this.message.ReceiptHandle) {
            sqs
                .deleteMessage({
                QueueUrl: this.queueUrl,
                ReceiptHandle: this.message.ReceiptHandle
            })
                .send();
        }
    }
    nack() {
        if (this.message.ReceiptHandle) {
            sqs
                .changeMessageVisibility({
                QueueUrl: this.queueUrl,
                ReceiptHandle: this.message.ReceiptHandle,
                VisibilityTimeout: 0
            })
                .send();
        }
    }
    reject() {
    }
    reply(_data, _options) {
    }
}
exports.handle = (queueUrl, handler) => {
    poll(queueUrl, handler);
};
const poll = (queueUrl, handler) => __awaiter(this, void 0, void 0, function* () {
    try {
        const response = yield sqs.receiveMessage({ QueueUrl: queueUrl }).promise();
        if (response.Messages && response.Messages.length > 0) {
            yield Promise.all(response.Messages.map(processMessage(queueUrl, handler)));
        }
        else {
            logger_1.logger.silly("poll", response);
        }
        poll(queueUrl, handler);
    }
    catch (err) {
        logger_1.logger.error(err.stack ? err.stack : err.message);
        setTimeout(() => poll(queueUrl, handler), 1000);
    }
});
const processMessage = (queueUrl, handler) => (msg) => __awaiter(this, void 0, void 0, function* () {
    try {
        logger_1.logger.verbose("message", msg);
        yield handler(new Message(queueUrl, msg));
    }
    catch (err) {
        logger_1.logger.error(err.stack ? err.stack : err.message, msg);
    }
});
const headers = (attributes) => {
    return Object.keys(attributes).reduce((result, key) => {
        switch (attributes[key].DataType) {
            case "String":
                result[key] = parseFloat(attributes[key].StringValue);
                break;
            case "Number":
                result[key] = attributes[key].StringValue;
                break;
            case "Binary":
                result[key] = attributes[key].BinaryValue;
                break;
        }
        return result;
    }, {});
};
//# sourceMappingURL=sqs.js.map