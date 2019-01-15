import * as t from "io-ts";
import { decode } from "./decoder";
import { errorHandler } from "./errors";
import { Logger, logger } from "./logger";
import { Headers, Message } from "./message";
import { response } from "./response";

export interface IResource<T, O, C> {
  type: [t.Type<T>, t.Type<O>];
  init: (options: any) => PromiseLike<C> | C;
  authorized: (headers: Headers, context: C) => PromiseLike<C> | C;
  exists: (headers: Headers, context: C) => PromiseLike<C> | C;
  forbidden: (headers: Headers, context: C) => PromiseLike<C> | C;
  update: (data: T, context: C) => PromiseLike<C> | C;
  response: (context: C) => PromiseLike<O> | O;
  logger?: Logger;
}

export const resource = <T, O = t.mixed, C = any>(desc: IResource<T, O, C>) => {
  const _logger = desc.logger ? desc.logger : logger;
  return (options: any) => (msg: Message) => {
    return Promise.resolve(desc.init(options))
      .then(context => desc.authorized(msg.properties.headers, context))
      .then(context => desc.exists(msg.properties.headers, context))
      .then(context => desc.forbidden(msg.properties.headers, context))
      .then(context =>
        decode(desc.type[0], msg.body).then(data =>
          Promise.resolve(desc.update(data, context))
            .then(_context => desc.response(_context))
            .then(result => decode(desc.type[1], result))
            .then(response(msg))
        )
      )
      .then(a => a, errorHandler(msg, _logger));
  };
};
