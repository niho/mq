import * as t from "io-ts";
import { Logger } from "./logger";
declare type Callback<T, C> = (data: T, context: C) => PromiseLike<void> | void;
export declare type Events<T, C> = ISingleCallbackStyle<T, C> | IEventCallbackStyle<T, C>;
interface ISingleCallbackStyle<T, C> {
    type: t.Type<T>;
    init: (options: any) => PromiseLike<C> | C;
    event: Callback<T, C>;
    logger?: Logger;
}
interface IEventCallbackStyle<T, C> {
    type: t.Type<T>;
    init: (options: any) => PromiseLike<C> | C;
    event?: string;
    events: {
        [key: string]: Callback<T, C>;
    };
    logger?: Logger;
}
export declare const events: <T, C = any>(desc: Events<T, C>) => (options: any) => (msg: import("./message").IMessage) => Promise<void>;
export {};
