"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.response = (msg) => (data, headers) => {
    if (msg.properties.replyTo && data) {
        msg.reply(data, { contentType: "application/json", headers });
    }
    else {
        msg.ack();
    }
};
//# sourceMappingURL=response.js.map