"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqp");
const async_mutex_1 = require("async-mutex");
exports.logger = console.log;
const workers = {};
const subscribers = {};
const fifoQueue = [];
exports.connected = false;
exports.connect = function () {
    let interval;
    const mutex = new async_mutex_1.Mutex();
    const connection = amqp.createConnection({
        url: process.env.INSURELLO_AMQP_URL
    });
    connection.on("error", function (err) {
        if (err.stack) {
            exports.logger(err.stack);
        }
        else {
            exports.logger(err);
        }
    });
    connection.on("close", function (hadError) {
        exports.logger("Connection to AMQP broker was closed.", hadError ? "Reconnecting..." : "");
        exports.connected = false;
    });
    connection.on("close", function () {
        clearInterval(interval);
    });
    connection.on("ready", function () {
        exports.logger("Connection to AMQP broker is ready.");
        exports.connected = true;
    });
    connection.on("ready", function () {
        for (const routingKey in workers) {
            if (workers.hasOwnProperty(routingKey)) {
                workers[routingKey].forEach((func) => {
                    subscribeWorker(routingKey, func);
                });
            }
        }
    });
    connection.on("ready", function () {
        for (const topic in subscribers) {
            if (subscribers.hasOwnProperty(topic)) {
                subscribers[topic].forEach((func) => {
                    subscribeTopic(topic, func);
                });
            }
        }
    });
    connection.on("ready", function () {
        interval = setInterval(drainQueue, 100);
    });
    const subscribeWorker = function (routingKey, func) {
        const q = connection.queue(routingKey, { autoDelete: false, durable: true }, function (_info) {
            q.subscribe({ ack: true, prefetchCount: 1 }, function (message, headers, deliveryInfo, ack) {
                messageHandler(func, message, headers, deliveryInfo, ack);
            });
        });
    };
    const subscribeTopic = function (topic, func) {
        const q = connection.queue(topic, { autoDelete: false, durable: true }, function (_info) {
            q.bind("amq.topic", topic);
            q.subscribe({ ack: true, prefetchCount: 1 }, function (message, headers, deliveryInfo, ack) {
                messageHandler(func, message, headers, deliveryInfo, ack);
            });
        });
    };
    const messageHandler = function (workerFunc, message, headers, deliveryInfo, ack) {
        const acknowledge = acknowledgeHandler.bind(ack);
        const replyTo = deliveryInfo.replyTo;
        try {
            const result = workerFunc(message, headers);
            if (result && result.then) {
                result.then((value) => {
                    sendReply(replyTo, value);
                    acknowledge();
                }, acknowledge);
            }
            else {
                acknowledge();
            }
        }
        catch (error) {
            acknowledge(error);
        }
    };
    const acknowledgeHandler = function (error) {
        if (error) {
            this.reject(false);
            exports.logger("MSG", this.routingKey, "(" + this.exchange + ")", "err");
            exports.logger(error);
        }
        else {
            this.acknowledge(false);
            exports.logger("MSG", this.routingKey, "(" + this.exchange + ")", "ok");
        }
    };
    const sendReply = function (replyTo, value) {
        if (replyTo && value) {
            connection.publish(replyTo, value, {}, function (err, msg) {
                if (err) {
                    exports.logger(msg);
                }
            });
        }
    };
    const drainQueue = function () {
        if (mutex.isLocked()) {
            return;
        }
        mutex
            .acquire()
            .then((release) => {
            while (fifoQueue.length > 0) {
                const msg = fifoQueue.shift();
                if (msg) {
                    internalPublish(msg)
                        .catch(exports.logger);
                }
            }
            release();
        });
    };
    const internalPublish = function (msg) {
        const options = {
            deliveryMode: 2,
            contentType: "application/json",
            headers: msg.headers ? msg.headers : {}
        };
        return new Promise((resolve, reject) => {
            const exchange = connection
                .exchange(msg.exchangeName, { confirm: true }, function () {
                exchange.publish(msg.routingKey, msg.data, options, function (failed, errorMessage) {
                    if (failed) {
                        reject(new Error(errorMessage));
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    };
};
exports.enqueue = function (routingKey, data, headers) {
    fifoQueue.push({
        exchangeName: "",
        routingKey,
        data,
        headers: headers ? headers : {}
    });
};
exports.worker = function (routingKey, func) {
    workers[routingKey] = workers[routingKey] || [];
    workers[routingKey].push(func);
};
exports.publish = function (routingKey, data, headers) {
    fifoQueue.push({
        exchangeName: "amq.topic",
        routingKey,
        data,
        headers: headers ? headers : {}
    });
};
exports.subscribe = function (topic, func) {
    subscribers[topic] = subscribers[topic] || [];
    subscribers[topic].push(func);
};
