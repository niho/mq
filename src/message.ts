export type Handler = (msg: IMessage) => Promise<unknown>;
export type Headers = IHeaders;
export type Message = IMessage;

export interface IHeaders {
  [key: string]: unknown;
}

export interface IMessage {
  headers: IHeaders;
  body: any;
}
