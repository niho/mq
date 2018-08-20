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
const $debug = debug("mq:client");
const defaultTimeout = 30 * 1000;
const fifoQueue = [];
const req = new zmq.Request({
    connectTimeout: defaultTimeout,
    receiveTimeout: defaultTimeout,
    sendTimeout: defaultTimeout,
    correlate: true
});
exports.startClient = function () {
    return __awaiter(this, void 0, void 0, function* () {
        req.connect("tcp://127.0.0.1:3000");
        $debug("REQ-CONNECT", "tcp://127.0.0.1:3000");
        const internalSend = (msg) => req.send([
            msg.routingKey,
            JSON.stringify(msg.headers),
            JSON.stringify(msg.data)
        ]);
        const receiveReply = (callback) => __awaiter(this, void 0, void 0, function* () {
            $debug("REQ-RECV-AWAIT");
            const [msg] = yield req.receive();
            const data = JSON.parse(msg.toString());
            $debug("REQ-RECV-REPLY", data);
            return callback.call(undefined, data);
        });
        const drainQueue = () => __awaiter(this, void 0, void 0, function* () {
            while (fifoQueue.length > 0) {
                const msg = fifoQueue.shift();
                if (msg) {
                    $debug("REQ-SEND", msg);
                    try {
                        yield internalSend(msg);
                        yield receiveReply(msg.callback);
                    }
                    catch (err) {
                        msg.callback(undefined, err);
                    }
                }
            }
        });
        while (!req.closed) {
            yield drainQueue();
        }
    });
};
exports.rpc = (routingKey, data, headers) => {
    return new Promise((resolve, reject) => {
        const callback = (msg, err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(msg);
            }
        };
        fifoQueue.push({
            routingKey,
            data: data ? data : {},
            headers: headers ? headers : {},
            callback
        });
    });
};
