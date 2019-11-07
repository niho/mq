const mq = require("../../dist/src/mq.js");
const sqs = require("./sqs.js");

if (process.env.SQS_QUEUE === undefined) {
  console.error("Use the SQS_QUEUE environment variable to specify a queue.")
  process.exit(1)
}

sqs.handle(
  process.env.SQS_QUEUE,
  mq.events({
    init: options => ({}),
    event: (data, context) => {
      console.log(data);
    }
  })
);
