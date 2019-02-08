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
  constructor(msg) {
    this.headers = msg.properties.headers;
    try {
      this.body = deserialize(
        msg.content,
        msg.properties.contentType,
        msg.properties.contentEncoding
      );
    } catch (err) {
      this.body = msg.content;
      console.warn("failed to deserialize message body");
    }
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
      const result = await handler(new Message(channel, msg));
      sendReply(channel, msg, result);
    } catch (err) {
      errorHandler(channel, msg, err);
    }
  }
};

const sendReply = (channel, msg, data, options) => {
  if (msg.properties.replyTo && data) {
    const contentType = getContentType(data, options);
    const payload = serialize(data, contentType);
    channel.sendToQueue(msg.properties.replyTo, payload, {
      contentType,
      contentEncoding: "utf8",
      correlationId:
        msg.properties.correlationId ||
        msg.properties.messageId,
      type: msg.properties.type + ".reply",
      timestamp: Date.now()
    });
  }
  channel.ack(msg);
}

const errorHandler = (channel, msg, err) => {
  if (err instanceof Error) {
    channel.nack(msg);
    console.error(err.stack ? err.stack : err.message, msg);
  } else if (typeof err === "object" && err.error) {
    sendReply(channel, msg, err);
    console.warn(err, msg);
  } else if (typeof err === "string") {
    sendReply(channel, msg, { error: err });
    console.warn(err, msg);
  } else {
    channel.reject(msg);
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
