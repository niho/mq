/// <reference types="node" />
export interface Headers {
    [key: string]: any;
}
export declare type Callback = (msg: any, err?: Error) => void;
export declare const startClient: () => Promise<void>;
export declare const rpc: (routingKey: string, data?: {} | Buffer | undefined, headers?: Headers | undefined, ttl?: number | undefined) => Promise<any>;
