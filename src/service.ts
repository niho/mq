import * as t from "io-ts";
import { decode } from "./decoder";
import { errorHandler } from "./errors";
import { Logger, logger } from "./logger";
import { Headers, Message } from "./message";
import { response } from "./response";

export interface IService<O, C> {
  type: t.Type<O>;
  init: (options: any) => PromiseLike<C> | C;
  authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
  forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
  response: (context: C) => PromiseLike<O> | O;
  logger?: Logger;
}

export const service = <O = t.mixed, C = any>(desc: IService<O, C>) => {
  const _logger = desc.logger ? desc.logger : logger;
  return (options: any) => (msg: Message) => {
    return Promise.resolve(desc.init(options))
      .then(context => desc.authorized(msg.properties.headers, context))
      .then(context => desc.forbidden(msg.properties.headers, context))
      .then(context => desc.response(context))
      .then(result => decode(desc.type, result))
      .then(response(msg))
      .then(a => a, errorHandler(msg, _logger));
  };
};
