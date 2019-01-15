export declare type Handler = (options: any) => (msg: IMessage) => Promise<void>;
export declare type Headers = IHeaders;
export declare type Properties = IProperties;
export declare type Message = IMessage;
export declare type ReplyOptions = IReplyOptions;
export interface IHeaders {
    [key: string]: unknown;
}
export interface IProperties {
    headers: IHeaders;
    replyTo?: string;
}
export interface IMessage {
    properties: IProperties;
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
