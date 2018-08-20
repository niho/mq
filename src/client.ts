import * as debug from "debug";
import * as zmq from "zeromq-ng";

const $debug = debug("mq:client");

const defaultTimeout = 30 * 1000; // 30 seconds

export interface Headers {
  [key: string]: any
}

export type Callback =
  (msg: any, err?: Error) => void;

interface Message {
  routingKey: string;
  data: {} | Buffer;
  headers: {} | Headers;
  callback: Callback;
}

const fifoQueue: Message[] = [];

const req = new zmq.Request({
  connectTimeout: defaultTimeout,
  receiveTimeout: defaultTimeout,
  sendTimeout: defaultTimeout,
  correlate: true
});

export const startClient = async function() {
  req.connect("tcp://127.0.0.1:3000");
  $debug("REQ-CONNECT", "tcp://127.0.0.1:3000");

  const internalSend = (msg: Message) => {
    $debug("REQ-SEND", msg);
    return req.send([
      msg.routingKey,
      JSON.stringify(msg.headers),
      JSON.stringify(msg.data)
    ]);
  };

  const receiveReply = async (callback: Callback): Promise<void> => {
    $debug("REQ-RECV-AWAIT");
    const [msg] = await req.receive();
    const data = JSON.parse(msg.toString());
    $debug("REQ-RECV-REPLY", data);
    return callback.call(undefined, data);
  };

  const drainQueue = async (): Promise<void> => {
    while (fifoQueue.length > 0) {
      const msg = fifoQueue.shift();
      if (msg) {
        try {
          await internalSend(msg);
          await receiveReply(msg.callback);
        } catch (err) {
          msg.callback(undefined, err);
        }
      }
    }
  };

  while (!req.closed) {
    await drainQueue();
  }
};


// == RPC CALL ==

export const rpc = (
    routingKey: string,
    data?: any,
    headers?: Headers
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callback: Callback = (msg, err) => {
      if (err) {
        reject(err);
      } else {
        resolve(msg);
      }
    };
    fifoQueue.push({
      routingKey,
      data: data ? data : {},
      headers: headers ? headers : {},
      callback
    });
  });
};
