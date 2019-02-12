import * as t from "io-ts";
declare type Callback<T, C> = (data: T, context: C) => PromiseLike<void> | void;
export declare type Events<T, C, O> = ISingleCallbackStyle<T, C, O> | IEventCallbackStyle<T, C, O>;
interface ISingleCallbackStyle<T, C, O> {
    type?: t.Type<T, O>;
    init: (options: any) => PromiseLike<C> | C;
    event: Callback<T, C>;
}
interface IEventCallbackStyle<T, C, O> {
    type?: t.Type<T, O>;
    init: (options: any) => PromiseLike<C> | C;
    event?: string;
    events: {
        [key: string]: Callback<T, C>;
    };
}
export declare const events: <T, C = any, O = T>(desc: Events<T, C, O>, options?: any) => (msg: import("./message").IMessage) => Promise<void>;
export {};
