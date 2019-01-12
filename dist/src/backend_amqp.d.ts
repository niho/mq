import * as request from "./request";
export declare const connect: () => Promise<{
    handle: (queueName: string, handler: request.Handler) => Promise<void>;
}>;
