import { Headers, Message } from "./message";

export const response = (msg: Message) => <T>(data: T, headers?: Headers) => {
  if (msg.properties.replyTo && data) {
    msg.reply(data, { contentType: "application/json", headers });
  } else {
    msg.ack();
  }
};
