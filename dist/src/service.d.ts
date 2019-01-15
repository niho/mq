import * as t from "io-ts";
import { Logger } from "./logger";
import { Headers } from "./message";
export interface IService<O, C> {
    type: t.Type<O>;
    init: (options: any) => PromiseLike<C> | C;
    authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
    forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
    response: (context: C) => PromiseLike<O> | O;
    logger?: Logger;
}
export declare const service: <O = unknown, C = any>(desc: IService<O, C>) => (options: any) => (msg: import("./message").IMessage) => Promise<void>;
