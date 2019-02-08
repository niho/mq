
exports.handle = (handler) => (event, context, callback) => {
  handler(new Message(event, context, callback));
};

class Message {
  constructor(event, context, callback) {
    this.context = context;
    this.callback = callback;
    this.headers = {};
    this.body = event;
  }

  ack() {
    this.callback();
  }

  nack() {
    // nop
  }

  reject() {
    this.callback("reject");
  }

  reply(data, _options) {
    this.callback(null, data);
  }
}
