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
const decoder_1 = require("./decoder");
const defaultEventField = "event";
exports.events = (desc, options = {}) => {
    return (msg) => __awaiter(this, void 0, void 0, function* () {
        return Promise.resolve(desc.init(options)).then(context => decoder_1.decode(desc.type, msg.body).then(data => isEventCallbackStyle(desc)
            ? Promise.resolve(eventHandler(desc, msg, data, context))
            : Promise.resolve(desc.event(data, context))));
    });
};
const eventHandler = (desc, msg, data, context) => (typeof desc.event === "string" || desc.event === undefined) &&
    msg.body[desc.event || defaultEventField] &&
    desc.events &&
    desc.events[msg.body[desc.event || defaultEventField]] &&
    typeof desc.events[msg.body[desc.event || defaultEventField]] === "function"
    ? desc.events[msg.body[desc.event || defaultEventField]](data, context)
    : Promise.reject();
const isEventCallbackStyle = (desc) => (typeof desc.event === "string" || desc.event === undefined) &&
    desc.events !== undefined;
//# sourceMappingURL=events.js.map