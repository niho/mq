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
const t = require("io-ts");
const decoder_1 = require("./decoder");
exports.resource = (desc, options = {}) => {
    return (msg) => __awaiter(this, void 0, void 0, function* () {
        return Promise.resolve(desc.init(options))
            .then(context => desc.authorized(msg.headers, context))
            .then(context => desc.exists(msg.headers, context))
            .then(context => desc.forbidden(msg.headers, context))
            .then(context => decoder_1.decode(desc.type ? desc.type[0] : t.any, msg.body).then(data => Promise.resolve(desc.update(data, context))
            .then(_context => desc.response(_context))
            .then(result => decoder_1.decode(desc.type ? desc.type[1] : t.any, result))));
    });
};
//# sourceMappingURL=resource.js.map