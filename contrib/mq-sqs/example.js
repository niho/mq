const mq = require("../../dist/src/mq.js");
const sqs = require("./sqs.js");

sqs.handle(
  "https://sqs.eu-west-1.amazonaws.com/100707962996/test",
  mq.events({
    init: options => ({}),
    event: (data, context) => {
      console.log(data);
    }
  })
);
