export declare const setLogger: (newLogger: (message?: any, ...optionalParams: any[]) => void) => void;
export interface Headers {
    [key: string]: any;
}
export declare type Worker = (message: any, headers: Headers) => PromiseLike<any> | void;
export declare const startServer: () => Promise<void>;
export declare const worker: (routingKey: string, func: Worker) => void;
