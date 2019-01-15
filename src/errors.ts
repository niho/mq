import { Logger } from "./logger";
import { Message } from "./message";
import { response } from "./response";

export interface IErrorDescription {
  error: string;
  error_description: string;
}

const isError = (err: any): err is IErrorDescription =>
  err &&
  typeof err === "object" &&
  (err as IErrorDescription).error !== undefined &&
  typeof (err as IErrorDescription).error === "string" &&
  (err as IErrorDescription).error_description !== undefined &&
  typeof (err as IErrorDescription).error_description === "string";

export const errorHandler = (msg: Message, logger: Logger) => (
  err?: unknown
) => {
  if (err instanceof Error) {
    msg.nack();
    logger.error(err.stack ? err.stack : err.message, msg.properties);
  } else if (isError(err)) {
    response(msg)(err, { "x-error": err.error });
    logger.warn(`${err}`, msg.properties);
  } else if (typeof err === "string") {
    response(msg)({ error: err }, { "x-error": err });
    logger.warn(`${err}`, msg.properties);
  } else {
    msg.reject();
    logger.verbose("rejected", msg.properties);
  }
};
