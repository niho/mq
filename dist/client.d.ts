export interface Headers {
    [key: string]: any;
}
export declare type Payload = object | string | number | boolean | null;
export declare type Callback = (msg: any, err?: Error) => void;
export declare class Client {
    private readonly service;
    private readonly port;
    private readonly socket;
    private readonly fifoQueue;
    constructor(service?: string, port?: number);
    close(): void;
    rpc(routingKey: string, payload?: Payload, headers?: Headers): Promise<any>;
    private drainQueue();
    private internalSend(msg);
    private receiveReply(callback);
}
