# MQ

A declarative abstraction layer for writing event handlers.

## Features

- Three basic event handler types (events, service and resource) for different use cases.
- A declarative callback/promise based API that hides potentially complex details like error handling and serializations.
- Statically typed validation of input/output messages using the `io-ts` library.
- Not tied to any specific back-end and can be used with any queue based protocol (currently only supports AMQP, SQS and Lambda).
- Ideal for building event sourced micro-services.

## Backends

To receive messages from the outside world you need a backend that can connect with some kind of message broker. The backend system is modular and backends are packaged as separate npm packages that you need to install and require in your project. The following backends are currently available:

- **mq-amqp** - A backend for interfacing with an AMQP broker like RabbitMQ or ActiveMQ. Uses the very stable and battle tested _amqplib_.
- **mq-lambda** - A backend for interfacing with AWS Lambda.
- **mq-sqs** - A backend for interfacing with AWS Simple Queue Service.

## Handler types

### Events

A generic event handler that reacts to incoming messages of the specified type.

```typescript
import * as mq from "mq";
import * as t from "io-ts";

mq.events({
  type: t.any,
  init: options => ({}),
  event: (data, context) => {
    switch (data.event) {
      case "hello": return Promise.resolve();
      default: return Promise.reject();
    }
});
```

If the `event` field is a string instead of a callback function it is interpreted as a field in the message body that contains the event name. The handler will then trigger a callback with the corresponding name instead of the generic callback. If no matching handler is found the message will be rejected.

```typescript
mq.events({
  type: commit.decoder,
  init: options => ({}),
  event: "event",
  events: {
    claim: (commit: Commit, context) => Promise.resolve(),
    closed: (commit: Commit, context) => Promise.resolve(),
    rejected: (commit: Commit, context) => Promise.resolve()
  }
});
```

### Service

A generic RPC service that responds with a reply message of the specified type. Supports request authorization.

```typescript
import * as mq from "mq";
import * as t from "io-ts";

const helloWorld = mq.service({
  type: t.type({ message: t.string }),
  init: options => ({}),
  authorized: (headers, context) => Promise.resolve(context),
  forbidden: (headers, context) => Promise.resolve(context),
  response: context => Promise.resolve({ message: "Hello World!" })
});
```

### Resource

A generic resource representation that can update the resource with the incoming message body and respond with a reply message of the specified type. Supports request authorization.

```typescript
import * as mq from "mq";
import * as t from "io-ts";

const helloName = mq.resource({
  type: [t.string, t.type({ message: t.string })],
  init: options => ({}),
  authorized: (headers, context) => Promise.resolve(context),
  exists: (headers, context) => Promise.resolve(context),
  forbidden: (headers, context) => Promise.resolve(context),
  update: (data, context) => Promise.resolve({ name: data }),
  response: context => Promise.resolve({ message: `Hello ${context.name}!`` })
});
```
