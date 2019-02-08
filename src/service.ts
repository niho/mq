import * as t from "io-ts";
import { decode } from "./decoder";
import { Headers, Message } from "./message";

export interface IService<T, C, O> {
  type: t.Type<T, O>;
  init: (options: any) => PromiseLike<C> | C;
  authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
  forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
  response: (context: C) => PromiseLike<T> | T;
}

export const service = <T = t.mixed, C = any, O = T>(
  desc: IService<T, C, O>,
  options: any = {}
) => {
  return async (msg: Message) => {
    return Promise.resolve(desc.init(options))
      .then(context => desc.authorized(msg.headers, context))
      .then(context => desc.forbidden(msg.headers, context))
      .then(context => desc.response(context))
      .then(result => decode(desc.type, result));
  };
};
