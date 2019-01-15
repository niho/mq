import * as message from "./message";
export declare const connect: () => Promise<{
    handle: (queueName: string, handler: message.Handler) => Promise<void>;
}>;
