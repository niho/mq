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
const uuidv4 = require("uuid/v4");
const zmq = require("zeromq-ng");
const $debug = debug("mq");
const defaultTimeout = 30 * 1000;
let logger = console.log;
exports.setLogger = (newLogger) => {
    logger = newLogger;
};
const red = (str) => process.env.NODE_ENV !== "production" ? `\x1b[31m${str}\x1b[0m` : str;
const green = (str) => process.env.NODE_ENV !== "production" ? `\x1b[32m${str}\x1b[0m` : str;
const startTime = () => process.hrtime();
const elapsed = (start) => `${(process.hrtime(start)[1] / 1000000).toFixed(3)} ms`;
const callbacks = {};
const workers = {};
const subscribers = {};
const fifoQueue = [];
let connected = false;
exports.isConnected = () => connected;
const push = new zmq.Push();
const pull = new zmq.Pull();
const reply = new zmq.Pull();
exports.startProducer = function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield push.bind("tcp://127.0.0.1:3000");
        connected = true;
        logger("Producer bound to port 3000.");
        reply.connect("tcp://127.0.0.1:3001");
        logger("Reply queue connected to port 3001.");
        const internalPublish = (msg) => push.send(JSON.stringify([msg.routingKey, Object.assign({}, msg.options.headers, { replyTo: msg.options.replyTo, correlationId: msg.options.correlationId }), msg.data]));
        const drainQueue = () => __awaiter(this, void 0, void 0, function* () {
            while (fifoQueue.length > 0) {
                const msg = fifoQueue.shift();
                if (msg) {
                    yield internalPublish(msg);
                    $debug("SEND", msg);
                }
            }
        });
        const receiveReplies = () => __awaiter(this, void 0, void 0, function* () {
            $debug("RECV-REPLIES");
            const messages = yield reply.receive();
            yield messages.map((msg) => {
                const data = JSON.parse(msg.toString());
                $debug("RECV-REPLY", data);
                for (const correlationId in callbacks) {
                    if (correlationId === data[0]) {
                        if (callbacks.hasOwnProperty(correlationId)) {
                            try {
                                callbacks[correlationId].call(undefined, data[1]);
                            }
                            catch (error) {
                                logger(error);
                            }
                        }
                    }
                }
            });
        });
        while (!push.closed && !reply.closed) {
            yield drainQueue();
            yield receiveReplies();
        }
    });
};
exports.startWorker = function () {
    return __awaiter(this, void 0, void 0, function* () {
        pull.connect("tcp://127.0.0.1:3000");
        logger("Worker connected to port 3000.");
        const messageHandler = function (workerFunc, message, headers, _options) {
            try {
                const result = workerFunc(message, headers);
                if (result && result.then) {
                    return Promise.resolve(result)
                        .then((value) => {
                        sendReply(headers.replyTo, headers.correlationId, value);
                    });
                }
                else {
                    return Promise.resolve();
                }
            }
            catch (error) {
                return Promise.reject(error);
            }
        };
        const sendReply = (replyTo, correlationId, payload) => {
            if (replyTo && payload) {
                $debug("REPLY-BIND");
                const socket = new zmq.Push();
                socket.bind(replyTo).then(() => {
                    $debug("REPLY-SEND", replyTo, correlationId, payload);
                    socket.send(JSON.stringify([correlationId, payload]));
                });
            }
        };
        const internalReceive = (msg) => {
            const start = startTime();
            const data = JSON.parse(msg.toString());
            const routingKey = data[0];
            (workers[routingKey] || []).map((_worker) => {
                const headers = data[1];
                const payload = data[2];
                messageHandler(_worker.func, payload, headers, _worker.options)
                    .then(() => logger("MSG", routingKey, green("OK"), elapsed(start)))
                    .catch((err) => logger("MSG", routingKey, red("ERR"), elapsed(start), err));
            });
        };
        while (!pull.closed) {
            const messages = yield pull.receive();
            yield messages.map(internalReceive);
        }
    });
};
exports.connect = function () {
    exports.startProducer();
    exports.startWorker();
};
exports.enqueue = function (routingKey, data, headers) {
    const options = {
        deliveryMode: 2,
        mandatory: true,
        contentType: "application/json",
        headers: headers ? headers : {}
    };
    fifoQueue.push({
        exchangeName: "",
        routingKey,
        data,
        options
    });
};
exports.worker = function (routingKey, func, options) {
    workers[routingKey] = workers[routingKey] || [];
    workers[routingKey].push({
        func,
        options: options ? options : { acknowledgeOnReceipt: true }
    });
};
exports.rpc = function (routingKey, data, headers, ttl) {
    const _data = data || {};
    const _ttl = ttl || defaultTimeout;
    const correlationId = uuidv4();
    const options = {
        contentType: "application/json",
        replyTo: "tcp://127.0.0.1:3001",
        correlationId,
        expiration: _ttl.toString(),
        headers: headers ? headers : {}
    };
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            clearTimeout(timeout);
            delete callbacks[correlationId];
            reject(new Error("Timeout"));
        }, _ttl);
        callbacks[correlationId] = (msg, err) => {
            clearTimeout(timeout);
            delete callbacks[correlationId];
            if (err) {
                reject(err);
            }
            else {
                resolve(msg);
            }
        };
        fifoQueue.push({
            exchangeName: "",
            routingKey,
            data: _data,
            options
        });
    });
};
exports.publish = function (routingKey, data, headers) {
    const options = {
        deliveryMode: 2,
        contentType: "application/json",
        headers: headers ? headers : {}
    };
    fifoQueue.push({
        exchangeName: "amq.topic",
        routingKey,
        data,
        options
    });
};
exports.subscribe = function (topic, func, options) {
    subscribers[topic] = subscribers[topic] || [];
    subscribers[topic].push({
        func,
        options: options ? options : { acknowledgeOnReceipt: true }
    });
};
