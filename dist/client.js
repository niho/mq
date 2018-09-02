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
const defaultPort = 3001;
class Client {
    constructor(service, port) {
        this.service = service || "127.0.0.1";
        this.port = port || defaultPort;
        this.socket = new zmq.Request({
            receiveTimeout: 100
        });
        this.socket.connect(`tcp://${this.service}:${this.port}`);
        $debug("CONNECT", `tcp://${this.service}:${this.port}`);
        this.fifoQueue = [];
        this.drainQueue();
    }
    close() {
        this.socket.close();
    }
    rpc(routingKey, payload, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const callback = (msg, err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(msg);
                    }
                };
                this.fifoQueue.push({
                    routingKey,
                    payload,
                    headers,
                    callback
                });
            }));
        });
    }
    drainQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            $debug("FIFO-LENGTH", this.fifoQueue.length);
            const msg = this.fifoQueue.shift();
            if (msg) {
                try {
                    yield this.internalSend(msg);
                    yield this.receiveReply(msg.callback);
                }
                catch (err) {
                    this.socket.close();
                    msg.callback(undefined, err);
                }
            }
            if (!this.socket.closed) {
                setTimeout(this.drainQueue.bind(this), 0);
            }
        });
    }
    internalSend(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            $debug("SEND", msg.routingKey, msg.headers, msg.payload);
            return this.socket.send([
                msg.routingKey,
                JSON.stringify(msg.headers !== undefined ? msg.headers : {}),
                JSON.stringify(msg.payload !== undefined ? msg.payload : {})
            ]);
        });
    }
    receiveReply(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            $debug("RECV-AWAIT");
            const [msg] = yield this.socket.receive();
            const data = JSON.parse(msg.toString());
            $debug("RECV-REPLY", data);
            return callback.call(undefined, data);
        });
    }
}
exports.Client = Client;
