import * as t from "io-ts";
import { decode } from "./decoder";
import { Message } from "./message";

const defaultEventField = "event";

type Callback<T, C> = (data: T, context: C) => PromiseLike<void> | void;

export type Events<T, C, O> =
  | ISingleCallbackStyle<T, C, O>
  | IEventCallbackStyle<T, C, O>;

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

export const events = <T, C = any, O = T>(
  desc: Events<T, C, O>,
  options: any = {}
) => {
  return async (msg: Message) => {
    return Promise.resolve(desc.init(options)).then(context =>
      decode(desc.type || t.any, msg.body).then(data =>
        isEventCallbackStyle(desc)
          ? Promise.resolve(eventHandler(desc, msg, data, context))
          : Promise.resolve(desc.event(data, context))
      )
    );
  };
};

const eventHandler = <T, C, O>(
  desc: IEventCallbackStyle<T, C, O>,
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

const isEventCallbackStyle = <T, C, O>(
  desc: Events<T, C, O>
): desc is IEventCallbackStyle<T, C, O> =>
  (typeof desc.event === "string" || desc.event === undefined) &&
  (desc as IEventCallbackStyle<T, C, O>).events !== undefined;
