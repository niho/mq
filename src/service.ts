import * as t from "io-ts";
import { decode } from "./decoder";
import { errorHandler } from "./errors";
import { Logger, logger } from "./logger";
import { Headers, Message } from "./message";
import { response } from "./response";

export interface IService<T, C, O> {
  type: t.Type<T, O>;
  init: (options: any) => PromiseLike<C> | C;
  authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
  forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
  response: (context: C) => PromiseLike<T> | T;
  logger?: Logger;
}

export const service = <T = t.mixed, C = any, O = T>(
  desc: IService<T, C, O>,
  options: any = {}
) => {
  const _logger = desc.logger ? desc.logger : logger;
  return (msg: Message) => {
    return Promise.resolve(desc.init(options))
      .then(context => desc.authorized(msg.headers, context))
      .then(context => desc.forbidden(msg.headers, context))
      .then(context => desc.response(context))
      .then(result => decode(desc.type, result))
      .then(response(msg))
      .then(a => a, errorHandler(msg, _logger));
  };
};
