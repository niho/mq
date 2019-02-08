import * as t from "io-ts";
import { Logger } from "./logger";
import { Headers } from "./message";
export interface IService<T, C, O> {
    type: t.Type<T, O>;
    init: (options: any) => PromiseLike<C> | C;
    authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
    forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
    response: (context: C) => PromiseLike<T> | T;
    logger?: Logger;
}
export declare const service: <T = unknown, C = any, O = T>(desc: IService<T, C, O>, options?: any) => (msg: import("./message").IMessage) => Promise<void>;
