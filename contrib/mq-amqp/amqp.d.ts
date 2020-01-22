import * as mq from "@ithaca/mq";

export declare const connect: () => Promise<{
  handle: (queueName: string, handler: mq.Handler) => Promise<void>;
}>;
