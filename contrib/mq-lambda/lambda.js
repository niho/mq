
exports.handle = (handler) => (event, context, callback) => {
  handler(new Message(event, context))
    .then(a => callback(null, encodeResponse(a)))
    .catch(err => callback(err));
};

class Message {
  constructor(event, context) {
    this.headers = context;
    this.body = event;
  }
}

const encodeResponse = (data) => {
  if (data.body && typeof data.body !== "string") {
    data.body = JSON.stringify(data.body);
  }
  return data;
}
