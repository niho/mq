import * as debug from "debug";
import * as zmq from "zeromq-ng";

const $debug = debug("mq:client");

const defaultPort = 3001;
// const defaultTimeout = 30 * 1000; // 30 seconds

export interface Headers {
  [key: string]: any
}

export type Payload =
  object | string | number | boolean | null;

export type Callback =
  (msg: any, err?: Error) => void;

interface Message {
  routingKey: string;
  payload?: Payload;
  headers?: Headers;
  callback: Callback;
}

export class Client {
  private readonly service: string;
  private readonly port: number;
  private readonly socket: zmq.Request;
  private readonly fifoQueue: Message[];

  constructor(service?: string, port?: number) {
    this.service = service || "127.0.0.1";
    this.port = port || defaultPort;
    this.fifoQueue = [];
    this.drainQueue();
  }

  public close(): void {
    this.socket.close();
  }

  public async rpc(
      routingKey: string,
      payload?: Payload,
      headers?: Headers
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const callback: Callback = (msg, err) => {
        if (err) {
          reject(err);
        } else {
          resolve(msg);
        }
      };
      this.fifoQueue.push({
        routingKey,
        payload,
        headers,
        callback
      });
    });
  }

  private internalConnect() {
    this.socket = new zmq.Request({
      receiveTimeout: 100
    });
    this.socket.connect(`tcp://${this.service}:${this.port}`);
    $debug("CONNECT", `tcp://${this.service}:${this.port}`);
  }

  private async drainQueue() {
    $debug("FIFO-LENGTH", this.fifoQueue.length);
    const msg = this.fifoQueue.shift();
    if (msg) {
      try {
        await this.internalSend(msg);
        await this.receiveReply(msg.callback);
      } catch (err) {
        msg.callback(undefined, err);
        if (err.code === "EAGAIN") {
          this.fifoQueue.push(msg);
          this.socket.close();
          this.socket = new Request();
          this.socket.connect("");
        } else {
          throw err;
        }
      }
    }
    if (!this.socket.closed) {
      setTimeout(this.drainQueue.bind(this), 0);
    }
  }

  private async internalSend(msg: Message): Promise<void> {
    $debug("SEND", msg.routingKey, msg.headers, msg.payload);
    return this.socket.send([
      msg.routingKey,
      JSON.stringify(msg.headers !== undefined ? msg.headers : {}),
      JSON.stringify(msg.payload !== undefined ? msg.payload : {})
    ]);
  }

  private async receiveReply(callback: Callback): Promise<void> {
    $debug("RECV-AWAIT");
    const [msg] = await this.socket.receive();
    const data = JSON.parse(msg.toString());
    $debug("RECV-REPLY", data);
    return callback.call(undefined, data);
  }
}
