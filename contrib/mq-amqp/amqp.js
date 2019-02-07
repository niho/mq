const amqp = require("amqplib");

exports.connect = async () => {
  const connection = await amqp.connect(
    process.env.AMQP_URL ? process.env.AMQP_URL : "amqp://localhost"
  );
  return Promise.resolve({
    handle: consumeQueue(connection)
  });
};

class Message {
  constructor(channel, msg) {
    this.channel = channel;
    this.message = msg;
    this.headers = msg.properties.headers;
    try {
      this.body = deserialize(
        msg.content,
        msg.properties.contentType,
        msg.properties.contentEncoding
      );
    } catch (err) {
      this.body = msg.content;
    }
  }

  ack() {
    this.channel.ack(this.message);
  }

  nack() {
    this.channel.nack(this.message, false, true);
  }

  reject() {
    this.channel.reject(this.message);
  }

  reply(data, options) {
    if (this.message.properties.replyTo) {
      const contentType = getContentType(data, options);
      const payload = serialize(data, contentType);
      this.channel.sendToQueue(this.message.properties.replyTo, payload, {
        contentType,
        contentEncoding: "utf8",
        correlationId:
          this.message.properties.correlationId ||
          this.message.properties.messageId,
        type: this.message.properties.type + ".reply",
        timestamp: Date.now()
      });
    }
    this.ack();
  }
}

const consumeQueue = connection => async (queueName, handler) => {
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName);
  channel.prefetch(1);
  await channel.consume(queueName, processMessage(channel, handler));
};

const processMessage = (channel, handler) => async (msg) => {
  if (msg) {
    try {
      await handler(new Message(channel, msg));
    } catch (err) {
      channel.nack(msg, false, true);
    }
  }
};

const serialize = (data, contentType) => {
  switch (contentType) {
    case "text/plain":
      return Buffer.from(data);
    case "application/json":
      return Buffer.from(JSON.stringify(data));
    default:
      return Buffer.from(data);
  }
};

const deserialize = (data, contentType, contentEncoding) => {
  switch (contentType) {
    case "text/plain":
      return data.toString(contentEncoding || "utf8");
    case "application/json":
      return JSON.parse(data.toString(contentEncoding || "utf8"));
    default:
      return data;
  }
};

const getContentType = (body, options) => {
  if (options && options.contentType) {
    return options.contentType;
  } else if (typeof body === "string") {
    return "text/plain";
  } else if (typeof body === "object" && !body.length) {
    return "application/json";
  } else {
    return "application/octet-stream";
  }
};
