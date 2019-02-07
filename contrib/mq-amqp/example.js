const mq = require("../../dist/src/mq.js");
const amqp = require("./amqp.js");

amqp.connect()
  .then(worker => {
    worker.handle(
      "mq.test",
      mq.events({
        type: mq.any,
        init: options => ({}),
        event: (data, context) => {
          console.log(data);
        }
      })({})
    );
  })
  .catch((err) => {
    console.log(err.stack ? err.stack : err.message);
    process.exit(1);
  });
