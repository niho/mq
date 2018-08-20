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

const req = new zmq.Request();

export const startClient = async function() {
  req.connect("tcp://127.0.0.1:3000");

  const internalSend = (msg: Message) =>
    req.send([
      msg.routingKey,
      JSON.stringify(msg.headers),
      JSON.stringify(msg.data)
    ]);

  const receiveReply = async (callback: Callback): Promise<void> => {
    $debug("REQ-RECV-AWAIT");
    const [msg] = await req.receive();
    const data = JSON.parse(msg.toString());
    $debug("REQ-RECV-REPLY", data);
    return callback.call(undefined, data);
  };

  const drainQueue = async () => {
    while (fifoQueue.length > 0) {
      const msg = fifoQueue.shift();
      if (msg) {
        $debug("REQ-SEND", msg);
        await internalSend(msg);
        await receiveReply(msg.callback);
      }
    }
  };

  while (!req.closed) {
    await drainQueue();
  }
};


// == RPC CALL ==

export const rpc = function(
    routingKey: string,
    data?: {} | Buffer,
    headers?: Headers,
    ttl?: number): Promise<any> {
  const _data = data || {};
  const _ttl = ttl || defaultTimeout;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      reject(new Error("Timeout"));
    }, _ttl);
    const callback: Callback = (msg, err) => {
      clearTimeout(timeout);
      if (err) {
        reject(err);
      } else {
        resolve(msg);
      }
    };
    fifoQueue.push({
      routingKey,
      data: _data,
      headers: headers ? headers : {},
      callback
    });
  });
};
