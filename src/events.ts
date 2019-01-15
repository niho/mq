import * as t from "io-ts";
import { decode } from "./decoder";
import { errorHandler } from "./errors";
import { Logger, logger } from "./logger";
import { Message } from "./message";

const defaultEventField = "event";

type Callback<T, C> = (data: T, context: C) => PromiseLike<void> | void;

export type Events<T, C> =
  | ISingleCallbackStyle<T, C>
  | IEventCallbackStyle<T, C>;

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

export const events = <T, C = any>(desc: Events<T, C>) => {
  const _logger = desc.logger ? desc.logger : logger;
  return (options: any) => (msg: Message) => {
    return Promise.resolve(desc.init(options))
      .then(context =>
        decode(desc.type, msg.body).then(data =>
          isEventCallbackStyle(desc)
            ? Promise.resolve(eventHandler(desc, msg, data, context))
            : Promise.resolve(desc.event(data, context))
        )
      )
      .then(() => msg.ack())
      .then(a => a, errorHandler(msg, _logger));
  };
};

const eventHandler = <T, C>(
  desc: IEventCallbackStyle<T, C>,
  msg: Message,
  data: T,
  context: C
) =>
  (typeof desc.event === "string" || desc.event === undefined) &&
  msg.body[desc.event || defaultEventField] &&
  desc.events &&
  desc.events[msg.body[desc.event || defaultEventField]] &&
  typeof desc.events[msg.body[desc.event || defaultEventField]] === "function"
    ? desc.events[msg.body[desc.event || defaultEventField]](data, context)
    : Promise.reject();

const isEventCallbackStyle = <T, C>(
  desc: Events<T, C>
): desc is IEventCallbackStyle<T, C> =>
  (typeof desc.event === "string" || desc.event === undefined) &&
  (desc as IEventCallbackStyle<T, C>).events !== undefined;
