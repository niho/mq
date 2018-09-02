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
const debug = require("debug");
const zmq = require("zeromq-ng");
const $debug = debug("mq:server");
let logger = console.log;
exports.setLogger = (newLogger) => {
    logger = newLogger;
};
const red = (str) => process.env.NODE_ENV !== "production" ? `\x1b[31m${str}\x1b[0m` : str;
const green = (str) => process.env.NODE_ENV !== "production" ? `\x1b[32m${str}\x1b[0m` : str;
const startTime = () => process.hrtime();
const elapsed = (start) => `${(process.hrtime(start)[1] / 1000000).toFixed(3)} ms`;
const workers = {};
const res = new zmq.Dealer();
exports.startServer = function () {
    return __awaiter(this, void 0, void 0, function* () {
        res.connect("tcp://127.0.0.1:3002");
        $debug("RES-BIND", "tcp://127.0.0.1:3002");
        yield res.send(["", "hello"]);
        $debug("RES-HELLO");
        const messageHandler = (messageId, workerFunc, message, headers) => {
            try {
                const result = workerFunc(message, headers);
                if (result && result.then) {
                    return Promise.resolve(result).then(sendReply(messageId));
                }
                else {
                    return Promise.resolve();
                }
            }
            catch (error) {
                return Promise.reject(error);
            }
        };
        const sendReply = (messageId) => (payload) => {
            $debug("RES-REPLY-SEND", payload);
            return res.send([
                messageId,
                Buffer.from(""),
                Buffer.from(JSON.stringify(payload))
            ]);
        };
        const internalReceive = () => __awaiter(this, void 0, void 0, function* () {
            const [id, , routingKey, headers, payload] = yield res.receive();
            $debug("RES-RECV", id, routingKey.toString(), headers.toString(), payload.toString());
            const start = startTime();
            const _routingKey = routingKey.toString();
            const _worker = workers[_routingKey];
            if (_worker) {
                const _headers = JSON.parse(headers.toString());
                const _payload = JSON.parse(payload.toString());
                return messageHandler(id, _worker, _payload, _headers)
                    .then(() => logger("MSG", _routingKey, green("OK"), elapsed(start)))
                    .catch((err) => logger("MSG", _routingKey, red("ERR"), elapsed(start), err));
            }
            else {
                return Promise.reject(new Error(`unknown routing key ${_routingKey}`));
            }
        });
        while (!res.closed) {
            try {
                yield internalReceive();
            }
            catch (err) {
                logger(err);
            }
        }
    });
};
exports.worker = (routingKey, func) => {
    workers[routingKey] = workers[routingKey] || [];
    workers[routingKey] = func;
};
