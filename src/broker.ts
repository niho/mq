import * as debug from "debug";
import * as zmq from "zeromq-ng";

const $debug = debug("mq:broker");

const router = new zmq.Router();
const dealer = new zmq.Dealer();
const proxy = new zmq.Proxy(router, dealer);

export const startBroker = async function() {
  $debug("PROXY", "Starting broker.");

  await proxy.frontEnd.bind("tcp://*:3001");
  $debug("PROXY-FRONTEND", "tcp://*:3001");

  await proxy.backEnd.bind("tcp://*:3002");
  $debug("PROXY-BACKEND", "tcp://*:3002");

  await proxy.run();
  $debug("PROXY-RUN");
};
