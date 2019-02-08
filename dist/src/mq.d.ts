import * as t from "io-ts";
import * as _events from "./events";
import * as _message from "./message";
import * as _resource from "./resource";
import * as _service from "./service";
export declare type Handler = _message.Handler;
export declare type Events<T, C, O> = _events.Events<T, C, O>;
export declare type Resource<T, U, C, TO, UO> = _resource.IResource<T, U, C, TO, UO>;
export declare type Service<T, C, O> = _service.IService<T, C, O>;
export declare const events: <T, C = any, O = T>(desc: _events.Events<T, C, O>, options?: any) => (msg: _message.IMessage) => Promise<void>;
export declare const resource: <T, U = unknown, C = any, TO = T, UO = U>(desc: _resource.IResource<T, U, C, TO, UO>, options?: any) => (msg: _message.IMessage) => Promise<U>;
export declare const service: <T = unknown, C = any, O = T>(desc: _service.IService<T, C, O>, options?: any) => (msg: _message.IMessage) => Promise<T>;
export declare const logger: import("winston").Logger;
export declare const any: t.AnyC;
