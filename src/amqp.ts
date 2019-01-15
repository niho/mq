import * as amqp from "amqplib";
import { logger } from "./logger";
import * as message from "./message";

export const connect = async () => {
  try {
    const connection = await amqp.connect(
      process.env.AMQP_URL ? process.env.AMQP_URL : "amqp://localhost"
    );
    return Promise.resolve({
      handle: consumeQueue(connection)
    });
  } catch (err) {
    logger.error(err.stack ? err.stack : err.message);
    process.exit(1);
    throw err;
  }
};

class Message implements message.Message {
  public readonly properties: message.Properties;
  public readonly body: any;
  private readonly channel: amqp.Channel;
  private readonly message: amqp.ConsumeMessage;

  constructor(channel: amqp.Channel, msg: amqp.ConsumeMessage) {
    this.channel = channel;
    this.message = msg;
    this.properties = {
      headers: msg.properties.headers,
      replyTo: msg.properties.replyTo
    };
    try {
      this.body = deserialize(
        msg.content,
        msg.properties.contentType,
        msg.properties.contentEncoding
      );
    } catch (err) {
      logger.warn("Failed to deserialize message.");
      this.body = msg.content;
    }
  }

  public ack(): void {
    this.channel.ack(this.message);
  }

  public nack(): void {
    this.channel.nack(this.message, false, true);
  }

  public reject(): void {
    this.channel.reject(this.message);
  }

  public reply(data: unknown, options?: message.ReplyOptions): void {
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

const consumeQueue = (connection: amqp.Connection) => async (
  queueName: string,
  handler: message.Handler
) => {
  try {
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName);
    channel.prefetch(1);
    await channel.consume(queueName, processMessage(channel, handler));
  } catch (err) {
    logger.error(err.stack ? err.stack : err.message);
    throw err;
  }
};

const processMessage = (
  channel: amqp.Channel,
  handler: message.Handler
) => async (msg: amqp.ConsumeMessage | null) => {
  if (msg) {
    try {
      await handler(new Message(channel, msg));
    } catch (err) {
      channel.nack(msg, false, true);
    }
  }
};

const serialize = (data: unknown, contentType: string): Buffer => {
  switch (contentType) {
    case "text/plain":
      return Buffer.from(data as string);
    case "application/json":
      return Buffer.from(JSON.stringify(data as string));
    default:
      return Buffer.from(data as Buffer);
  }
};

const deserialize = (
  data: Buffer,
  contentType: string,
  contentEncoding: string
): unknown => {
  switch (contentType) {
    case "text/plain":
      return data.toString(contentEncoding || "utf8");
    case "application/json":
      return JSON.parse(data.toString(contentEncoding || "utf8"));
    default:
      return data;
  }
};

const getContentType = (body: unknown, options?: message.ReplyOptions) => {
  if (options && options.contentType) {
    return options.contentType;
  } else if (typeof body === "string") {
    return "text/plain";
  } else if (typeof body === "object" && !(body as any).length) {
    return "application/json";
  } else {
    return "application/octet-stream";
  }
};
