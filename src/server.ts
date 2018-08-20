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

const res = new zmq.Response();

export const startServer = async function() {
  await res.bind("tcp://127.0.0.1:3000");
  $debug("RES-BIND", "tcp://127.0.0.1:3000");
  logger("Server bound to port 3000.");

  const messageHandler = (
    workerFunc: Worker,
    message: any,
    headers: Headers
  ): Promise<void> => {
    try {
      const result = workerFunc(message, headers);
      if (result && result.then) {
        return Promise.resolve(result).then(sendReply);
      } else {
        return Promise.resolve();
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const sendReply = (payload: any): Promise<void> => {
    $debug("REPLY-SEND", payload);
    return res.send(JSON.stringify(payload));
  };

  const internalReceive = (
    routingKey: Buffer,
    headers: Buffer,
    payload: Buffer
  ): Promise<any> => {
    const start = startTime();
    const _routingKey = routingKey.toString();
    const _worker = workers[_routingKey];
    if (_worker) {
      const _headers = JSON.parse(headers.toString());
      const _payload = JSON.parse(payload.toString());
      return messageHandler(_worker, _payload, _headers)
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
      const [routingKey, headers, payload] = await res.receive();
      $debug("RECV",
        routingKey.toString(),
        headers.toString(),
        payload.toString()
      );
      await internalReceive(routingKey, headers, payload);
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
