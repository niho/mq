
exports.handle = (handler) => (event, context, callback) => {
  handler(new Message(event, context))
    .then(a => callback(null, a))
    .catch(err => callback(err));
};

class Message {
  constructor(event, context) {
    this.headers = context;
    this.body = event;
  }
}
