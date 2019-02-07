"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decoder_1 = require("./decoder");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const response_1 = require("./response");
exports.resource = (desc) => {
    const _logger = desc.logger ? desc.logger : logger_1.logger;
    return (options) => (msg) => {
        return Promise.resolve(desc.init(options))
            .then(context => desc.authorized(msg.headers, context))
            .then(context => desc.exists(msg.headers, context))
            .then(context => desc.forbidden(msg.headers, context))
            .then(context => decoder_1.decode(desc.type[0], msg.body).then(data => Promise.resolve(desc.update(data, context))
            .then(_context => desc.response(_context))
            .then(result => decoder_1.decode(desc.type[1], result))
            .then(response_1.response(msg))))
            .then(a => a, errors_1.errorHandler(msg, _logger));
    };
};
//# sourceMappingURL=resource.js.map