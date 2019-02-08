export declare type Handler = (msg: IMessage) => Promise<unknown>;
export declare type Headers = IHeaders;
export declare type Message = IMessage;
export interface IHeaders {
    [key: string]: unknown;
}
export interface IMessage {
    headers: IHeaders;
    body: any;
}
