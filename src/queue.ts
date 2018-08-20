import * as amqp from "amqp";
import * as debug from "debug";
import * as uuidv4 from "uuid/v4";
import * as zmq from "zeromq-ng";

const $debug = debug("mq");

const defaultTimeout = 30 * 1000; // 30 seconds

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

export type Worker =
  (message: any, headers: Headers) => PromiseLike<any> | void;

export interface WorkerOptions {
  acknowledgeOnReceipt: boolean;
}

export interface Headers {
  [key: string]: any
}

interface Queues {
  [name: string]: Array<{ func: Worker, options: WorkerOptions }>
}

interface Callbacks {
  [correlationId: string]: (msg: any, err?: Error) => void;
}

interface Message {
  exchangeName: string;
  routingKey: string;
  data: {} | Buffer;
  options: amqp.ExchangePublishOptions;
}

const callbacks: Callbacks = {};
const workers: Queues = {};
const subscribers: Queues = {};
const fifoQueue: Message[] = [];

let connected: boolean = false;
export const isConnected = () => connected;

const push = new zmq.Push();
const pull = new zmq.Pull();
const reply = new zmq.Pull();

export const startProducer = async function() {
  await push.bind("tcp://127.0.0.1:3000");
  connected = true;
  logger("Producer bound to port 3000.");

  reply.connect("tcp://127.0.0.1:3001");
  logger("Reply queue connected to port 3001.");

  const internalPublish = (msg: Message) =>
    push.send(JSON.stringify(
      [msg.routingKey, {
        ...msg.options.headers,
        replyTo: msg.options.replyTo,
        correlationId: msg.options.correlationId
      }, msg.data]));

  const drainQueue = async () => {
    while (fifoQueue.length > 0) {
      const msg = fifoQueue.shift();
      if (msg) {
        await internalPublish(msg);
        $debug("SEND", msg);
      }
    }
  };

  const receiveReplies = async () => {
    $debug("RECV-REPLIES");
    const messages = await reply.receive();
    await messages.map((msg: Buffer) => {
      const data = JSON.parse(msg.toString());
      $debug("RECV-REPLY", data);
      for (const correlationId in callbacks) {
        if (correlationId === data[0]) {
          if (callbacks.hasOwnProperty(correlationId)) {
            try {
              callbacks[correlationId].call(undefined, data[1]);
            } catch (error) {
              logger(error);
            }
          }
        }
      }
    });
  };

  while (!push.closed && !reply.closed) {
    await drainQueue();
    await receiveReplies();
  }
};

export const startWorker = async function() {
  pull.connect("tcp://127.0.0.1:3000");
  logger("Worker connected to port 3000.");

  const messageHandler = function(
      workerFunc: Worker,
      message: any,
      headers: Headers,
      _options: WorkerOptions): Promise<void> {
    try {
      const result = workerFunc(message, headers);
      if (result && result.then) {
        return Promise.resolve(result)
          .then((value) => {
            sendReply(headers.replyTo, headers.correlationId, value);
          });
      } else {
        return Promise.resolve();
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const sendReply = (
      replyTo: string,
      correlationId: string,
      payload: any) => {
    if (replyTo && payload) {
      $debug("REPLY-BIND");
      const socket = new zmq.Push();
      socket.bind(replyTo).then(() => {
        $debug("REPLY-SEND", replyTo, correlationId, payload);
        socket.send(JSON.stringify([correlationId, payload]));
      });
    }
  };

  const internalReceive = (msg: Buffer) => {
    const start = startTime();
    const data = JSON.parse(msg.toString());
    const routingKey = data[0];
    (workers[routingKey] || []).map((_worker) => {
      const headers = data[1];
      const payload = data[2];
      messageHandler(_worker.func, payload, headers, _worker.options)
        .then(() =>
          logger("MSG", routingKey, green("OK"), elapsed(start)))
        .catch((err) =>
          logger("MSG", routingKey, red("ERR"), elapsed(start), err));
    });
  };

  while (!pull.closed) {
    const messages = await pull.receive();
    await messages.map(internalReceive);
  }
};

export const connect = function() {
  startProducer();
  startWorker();
};

// == RPC WORKERS ==

export const enqueue = function(
    routingKey: string,
    data: {} | Buffer,
    headers?: Headers): void {
  const options: amqp.ExchangePublishOptions = {
    deliveryMode: 2, // Persistent
    mandatory: true,
    contentType: "application/json",
    headers: headers ? headers : {}
  };
  fifoQueue.push({
    exchangeName: "",
    routingKey,
    data,
    options
  });
};

export const worker =
    function(routingKey: string, func: Worker, options?: WorkerOptions) {
  workers[routingKey] = workers[routingKey] || [];
  workers[routingKey].push({
    func,
    options: options ? options : { acknowledgeOnReceipt: true }
  });
};

// == RPC CALL ==

export const rpc = function(
    routingKey: string,
    data?: {} | Buffer,
    headers?: Headers,
    ttl?: number): Promise<any> {
  const _data = data || {};
  const _ttl = ttl || defaultTimeout;
  const correlationId = uuidv4();
  const options: amqp.ExchangePublishOptions = {
    contentType: "application/json",
    replyTo: "tcp://127.0.0.1:3001",
    correlationId,
    expiration: _ttl.toString(),
    headers: headers ? headers : {}
  };
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      delete callbacks[correlationId];
      reject(new Error("Timeout"));
    }, _ttl);
    callbacks[correlationId] = (msg, err) => {
      clearTimeout(timeout);
      delete callbacks[correlationId];
      if (err) {
        reject(err);
      } else {
        resolve(msg);
      }
    };
    fifoQueue.push({
      exchangeName: "",
      routingKey,
      data: _data,
      options
    });
  });
};

// == TOPIC PUB/SUB ==

export const publish = function(
    routingKey: string,
    data: {} | Buffer,
    headers?: Headers): void {
  const options: amqp.ExchangePublishOptions = {
    deliveryMode: 2, // Persistent
    contentType: "application/json",
    headers: headers ? headers : {}
  };
  fifoQueue.push({
    exchangeName: "amq.topic",
    routingKey,
    data,
    options
  });
};

export const subscribe =
    function(topic: string, func: Worker, options?: WorkerOptions) {
  subscribers[topic] = subscribers[topic] || [];
  subscribers[topic].push({
    func,
    options: options ? options : { acknowledgeOnReceipt: true }
  });
};
