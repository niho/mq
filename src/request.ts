export type Handler = (req: Request) => Promise<void>;

export interface Headers {
  [key: string]: unknown;
}

export interface Properties {
  headers: Headers;
  replyTo?: string;
}

export interface Request {
  properties: Properties;

  body: any;

  ack: () => void;
  nack: () => void;
  reject: () => void;
  reply: (data: unknown, options?: ReplyOptions) => void;
}

export interface ReplyOptions {
  more?: boolean;
  replyType?: string;
  contentType?: string;
  headers?: Headers;
}
