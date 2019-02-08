const AWS = require("aws-sdk");
const sqs = new AWS.SQS();

exports.handle = (queueUrl, handler) => {
  poll(queueUrl, handler);
};

class Message {
  constructor(msg) {
    this.headers = msg.MessageAttributes ? headers(msg.MessageAttributes) : {};
    try {
      this.body = msg.Body ? JSON.parse(msg.Body) : undefined;
    } catch (err) {
      this.body = msg.Body;
      console.warn("failed to deserialize message body");
    }
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
    console.error(err.stack ? err.stack : err.message);
    setTimeout(() => poll(queueUrl, handler), 1000);
  }
};

const processMessage = (queueUrl, handler) => async (msg) => {
  try {
    await handler(new Message(queueUrl, msg));
    await acknowledgeMessage(queueUrl, msg);
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.stack ? err.stack : err.message, msg);
    } else {
      console.warn(err, msg);
      await acknowledgeMessage(queueUrl, msg);
    }
  }
};

const acknowledgeMessage = async (queueUrl, msg) => {
  if (msg.ReceiptHandle) {
    return sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle
      })
      .promise();
  } else {
    return Promise.resolve();
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
