import * as mq from "@ithaca/mq";

export declare const handle: (handler: mq.Handler) => (
  event: any,
  context: any,
  callback: (err: Error, result: object) => void
) => void;
