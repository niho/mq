"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = require("./response");
const isError = (err) => err &&
    typeof err === "object" &&
    err.error !== undefined &&
    typeof err.error === "string" &&
    err.error_description !== undefined &&
    typeof err.error_description === "string";
exports.errorHandler = (msg, logger) => (err) => {
    if (err instanceof Error) {
        msg.nack();
        logger.error(err.stack ? err.stack : err.message, msg);
    }
    else if (isError(err)) {
        response_1.response(msg)(err, { "x-error": err.error });
        logger.warn(`${err}`, msg);
    }
    else if (typeof err === "string") {
        response_1.response(msg)({ error: err }, { "x-error": err });
        logger.warn(`${err}`, msg);
    }
    else {
        msg.reject();
        logger.verbose("rejected", msg);
    }
};
//# sourceMappingURL=errors.js.map