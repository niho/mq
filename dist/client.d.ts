export interface Headers {
    [key: string]: any;
}
export declare type Callback = (msg: any, err?: Error) => void;
export declare const startClient: () => Promise<void>;
export declare const rpc: (routingKey: string, data?: any, headers?: Headers | undefined) => Promise<any>;
