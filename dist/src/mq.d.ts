import * as t from "io-ts";
import * as _events from "./events";
import * as _resource from "./resource";
import * as _service from "./service";
export declare type Events<T, C> = _events.Events<T, C>;
export declare type Resource<T, O, C> = _resource.Resource<T, O, C>;
export declare type Service<O, C> = _service.Service<O, C>;
export declare const type: <P extends t.Props>(props: P, name?: string | undefined) => t.InterfaceType<P, t.TypeOfProps<P>, t.OutputOfProps<P>, unknown>;
export declare const events: <T, C = any>(desc: _events.Events<T, C>) => (options: any) => (req: import("./request").Request) => Promise<void>;
export declare const resource: <T, O = unknown, C = any>(desc: _resource.Resource<T, O, C>) => (options: any) => (req: import("./request").Request) => Promise<void>;
export declare const service: <O = unknown, C = any>(desc: _service.Service<O, C>) => (options: any) => (req: import("./request").Request) => Promise<void>;