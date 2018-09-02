import * as debug from "debug";
import * as zmq from "zeromq-ng";

const $debug = debug("mq:server");

type Logger =
  (message?: any, ...optionalParams: any[]) => void;

let logger: Logger = console.log;

export const setLogger = (newLogger: Logger) => {
  logger = newLogger;
};

const red = (str: string): string =>
  process.env.NODE_ENV !== "production" ? `\x1b[31m${str}\x1b[0m` : str;

const green = (str: string): string =>
  process.env.NODE_ENV !== "production" ? `\x1b[32m${str}\x1b[0m` : str;

const startTime = (): [number, number] =>
  process.hrtime();

const elapsed = (start: [number, number]): string =>
  `${(process.hrtime(start)[1] / 1000000).toFixed(3)} ms`;

export interface Headers {
  [key: string]: any
}

export type Worker =
  (message: any, headers: Headers) => PromiseLike<any> | void;

interface Workers {
  [name: string]: Worker;
}

const workers: Workers = {};
const res = new zmq.Dealer();

export const startServer = async function() {
  res.connect("tcp://127.0.0.1:3002");
  $debug("RES-BIND", "tcp://127.0.0.1:3002");

  await res.send(["", "hello"]);
  $debug("RES-HELLO");

  const messageHandler = (
    messageId: Buffer,
    workerFunc: Worker,
    message: any,
    headers: Headers
  ): Promise<void> => {
    try {
      const result = workerFunc(message, headers);
      if (result && result.then) {
        return Promise.resolve(result).then(sendReply(messageId));
      } else {
        return Promise.resolve();
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const sendReply = (messageId: Buffer) => (payload: any): Promise<void> => {
    $debug("RES-REPLY-SEND", payload);
    return res.send([
      messageId,
      Buffer.from(""),
      Buffer.from(JSON.stringify(payload))
    ]);
  };

  const internalReceive = async (): Promise<any> => {
    const [id, /* null */, routingKey, headers, payload] = await res.receive();
    $debug("RES-RECV",
      id,
      routingKey.toString(),
      headers.toString(),
      payload.toString()
    );
    const start = startTime();
    const _routingKey = routingKey.toString();
    const _worker = workers[_routingKey];
    if (_worker) {
      const _headers = JSON.parse(headers.toString());
      const _payload = JSON.parse(payload.toString());
      return messageHandler(id, _worker, _payload, _headers)
        .then(() =>
          logger("MSG", _routingKey, green("OK"), elapsed(start)))
        .catch((err) =>
          logger("MSG", _routingKey, red("ERR"), elapsed(start), err));
    } else {
      return Promise.reject(new Error(`unknown routing key ${_routingKey}`));
    }
  };

  while (!res.closed) {
    try {
      await internalReceive();
    } catch (err) {
      logger(err);
    }
  }
};

// == RPC WORKERS ==

export const worker = (routingKey: string, func: Worker) => {
  workers[routingKey] = workers[routingKey] || [];
  workers[routingKey] = func;
};
