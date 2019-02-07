import * as AWS from "aws-sdk";
import { logger } from "./logger";
import * as message from "./message";

const sqs = new AWS.SQS();

class Message implements message.Message {
  public readonly headers: message.Headers;
  public readonly body: any;
  private readonly queueUrl: string;
  private readonly message: AWS.SQS.Message;

  constructor(queueUrl: string, msg: AWS.SQS.Message) {
    this.queueUrl = queueUrl;
    this.message = msg;
    this.headers = msg.MessageAttributes ? headers(msg.MessageAttributes) : [];
    try {
      this.body = msg.Body ? JSON.parse(msg.Body) : undefined;
    } catch (err) {
      this.body = msg.Body;
    }
  }

  public ack(): void {
    if (this.message.ReceiptHandle) {
      sqs
        .deleteMessage({
          QueueUrl: this.queueUrl,
          ReceiptHandle: this.message.ReceiptHandle
        })
        .send();
    }
  }

  public nack(): void {
    if (this.message.ReceiptHandle) {
      sqs
        .changeMessageVisibility({
          QueueUrl: this.queueUrl,
          ReceiptHandle: this.message.ReceiptHandle,
          VisibilityTimeout: 0
        })
        .send();
    }
  }

  public reject(): void {
    // nop
  }

  public reply(_data: unknown, _options?: message.ReplyOptions): void {
    // nop
  }
}

export const handle = (queueUrl: string, handler: message.Handler) => {
  poll(queueUrl, handler);
};

const poll = async (queueUrl: string, handler: message.Handler) => {
  try {
    const response = await sqs.receiveMessage({ QueueUrl: queueUrl }).promise();
    if (response.Messages && response.Messages.length > 0) {
      await Promise.all(
        response.Messages.map(processMessage(queueUrl, handler))
      );
    } else {
      logger.silly("poll", response);
    }
    poll(queueUrl, handler);
  } catch (err) {
    logger.error(err.stack ? err.stack : err.message);
    setTimeout(() => poll(queueUrl, handler), 1000);
  }
};

const processMessage = (queueUrl: string, handler: message.Handler) => async (
  msg: AWS.SQS.Message
) => {
  try {
    logger.verbose("message", msg);
    await handler(new Message(queueUrl, msg));
  } catch (err) {
    logger.error(err.stack ? err.stack : err.message, msg);
  }
};

const headers = (
  attributes: AWS.SQS.MessageBodyAttributeMap
): message.Headers => {
  return Object.keys(attributes).reduce((result: any, key) => {
    switch (attributes[key].DataType) {
      case "String":
        result[key] = parseFloat(attributes[key].StringValue as string);
        break;
      case "Number":
        result[key] = attributes[key].StringValue;
        break;
      case "Binary":
        result[key] = attributes[key].BinaryValue;
        break;
    }
    return result;
  }, {});
};
