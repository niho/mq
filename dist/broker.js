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
const $debug = debug("mq:broker");
const router = new zmq.Router();
const dealer = new zmq.Dealer();
const proxy = new zmq.Proxy(router, dealer);
exports.startBroker = function () {
    return __awaiter(this, void 0, void 0, function* () {
        $debug("PROXY", "Starting broker.");
        yield proxy.frontEnd.bind("tcp://*:3001");
        $debug("PROXY-FRONTEND", "tcp://*:3001");
        yield proxy.backEnd.bind("tcp://*:3002");
        $debug("PROXY-BACKEND", "tcp://*:3002");
        yield proxy.run();
        $debug("PROXY-RUN");
    });
};
