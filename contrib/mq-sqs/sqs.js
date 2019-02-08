const AWS = require("aws-sdk");
const sqs = new AWS.SQS();

exports.handle = (queueUrl, handler) => {
  poll(queueUrl, handler);
};

class Message {
  constructor(queueUrl, msg) {
    this.queueUrl = queueUrl;
    this.message = msg;
    this.headers = msg.MessageAttributes ? headers(msg.MessageAttributes) : {};
    try {
      this.body = msg.Body ? JSON.parse(msg.Body) : undefined;
    } catch (err) {
      this.body = msg.Body;
    }
  }

  ack() {
    if (this.message.ReceiptHandle) {
      sqs
        .deleteMessage({
          QueueUrl: this.queueUrl,
          ReceiptHandle: this.message.ReceiptHandle
        })
        .send();
    }
  }

  nack() {
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

  reject() {
    // nop
  }

  reply(_data, _options) {
    // nop
  }
}

const poll = async (queueUrl, handler) => {
  try {
    const response = await sqs.receiveMessage({ QueueUrl: queueUrl }).promise();
    if (response.Messages && response.Messages.length > 0) {
      await Promise.all(
        response.Messages.map(processMessage(queueUrl, handler))
      );
    }
    poll(queueUrl, handler);
  } catch (err) {
    console.log(err.stack ? err.stack : err.message);
    setTimeout(() => poll(queueUrl, handler), 1000);
  }
};

const processMessage = (queueUrl, handler) => async (msg) => {
  try {
    await handler(new Message(queueUrl, msg));
  } catch (err) {
    console.log(err.stack ? err.stack : err.message, msg);
  }
};

const headers = (attributes) => {
  return Object.keys(attributes).reduce((result, key) => {
    switch (attributes[key].DataType) {
      case "String":
        result[key] = parseFloat(attributes[key].StringValue);
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
