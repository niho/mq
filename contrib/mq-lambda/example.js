const mq = require("../../dist/src/mq.js");
const lambda = require("./lambda.js");

exports.handler = lambda.handle(
  mq.events({
    init: options => ({}),
    event: (data, context) => {
      console.log(data);
    }
  })
);
