import * as t from "io-ts";
import { Headers } from "./message";
export interface IResource<T, U, C, TO, UO> {
    type?: [t.Type<T, TO>, t.Type<U, UO>];
    init: (options: any) => PromiseLike<C> | C;
    authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
    exists: (headers: Headers, context: C) => PromiseLike<C> | C;
    forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
    update: (data: T, context: C) => PromiseLike<C> | C;
    response: (context: C) => PromiseLike<U> | U;
}
export declare const resource: <T, U = unknown, C = any, TO = T, UO = U>(desc: IResource<T, U, C, TO, UO>, options?: any) => (msg: import("./message").IMessage) => Promise<any>;
