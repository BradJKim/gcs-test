"use strict";
// rabbitmq calls here
// https://www.rabbitmq.com/tutorials/tutorial-one-javascript
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbmqChannel = void 0;
// global variable channel in server.ts
const callback_api_1 = __importDefault(require("amqplib/callback_api"));
const username = process.env.RABBITMQ_USER;
const password = process.env.RABBITMQ_PASS;
const port = process.env.RABBITMQ_PORT;
const URL = `amqp://${username}:${password}@localhost:${port}`;
let rbmqChannel;
callback_api_1.default.connect(URL, (err, connection) => {
    if (err) {
        console.error('Failed to connect to RabbitMQ', err);
        return;
    }
    connection.createChannel((err, ch) => {
        if (err) {
            console.error('Failed to create RabbitMQ channel', err);
            return;
        }
        exports.rbmqChannel = rbmqChannel = ch;
        const queue = 'websocket_queue';
        rbmqChannel.assertQueue(queue, { durable: false });
        console.log('RabbitMQ connection established');
    });
});
