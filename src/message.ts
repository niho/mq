export type Handler = (msg: IMessage) => Promise<void>;
export type Headers = IHeaders;
export type Message = IMessage;
export type ReplyOptions = IReplyOptions;

export interface IHeaders {
  [key: string]: unknown;
}

export interface IMessage {
  headers: IHeaders;
  body: any;
  ack: () => void;
  nack: () => void;
  reject: () => void;
  reply: (data: unknown, options?: IReplyOptions) => void;
}

export interface IReplyOptions {
  more?: boolean;
  replyType?: string;
  contentType?: string;
  headers?: IHeaders;
}
