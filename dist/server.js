"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const controller_1 = __importDefault(require("./controllers/controller"));
const dbConfig_1 = __importDefault(require("./config/dbConfig"));
const amqplib_1 = __importDefault(require("amqplib"));
const port = 8080;
const username = process.env.RABBITMQ_USER;
const password = process.env.RABBITMQ_PASS;
const rbmqPort = process.env.RABBITMQ_PORT;
const RABBIT_URL = `amqp://${username}:${password}@rabbitmq:${rbmqPort}`;
const wss = new ws_1.default.Server({ port: port });
(function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Starting Server...");
            // Database Sync
            try {
                yield dbConfig_1.default.sync({ force: false, logging: false });
                console.log('Database synced and connection established');
            }
            catch (error) {
                console.error('Unable to sync Database: ', error);
            }
            // RabbitMQ Sync
            const connection = yield amqplib_1.default.connect(RABBIT_URL);
            const channel = yield connection.createChannel();
            const consumer_queue = 'server_queue';
            const publisher_queue = 'serial_queue';
            yield channel.assertQueue(consumer_queue, { durable: true });
            connection.on('close', () => {
                console.error('RabbitMQ connection closed unexpectedly');
            });
            console.log('RabbitMQ connection established');
            // Establish Listener for Cubesat Response Handling
            channel.consume(consumer_queue, (msg) => {
                if (msg !== null) {
                    const message = msg.content.toString();
                    console.log('Received:', message);
                    channel.ack(msg);
                    const parsedMessage = JSON.parse(message); // TODO: Error check make sure message is json or else it crashes
                    const controllerParams = [
                        channel,
                        publisher_queue,
                        // ws,
                        parsedMessage.message,
                        parsedMessage.params
                    ];
                    switch (parsedMessage.type) {
                        case "response":
                            // wsController(...controllerParams);
                            break;
                        case "ping":
                            channel.sendToQueue(publisher_queue, Buffer.from("Ping received by server"));
                            break;
                        default:
                            channel.sendToQueue(publisher_queue, Buffer.from("Invalid Message Type, rejecting message"));
                            break;
                    }
                }
                else {
                    console.log('Consumer cancelled by server');
                }
            });
            console.log('Consumer Running');
            // Websocket Server Sync
            wss.on('connection', (ws) => {
                // Client Request Type Handling
                ws.on('message', (message) => {
                    console.log('received: %s', message);
                    const parsedMessage = JSON.parse(message.toString());
                    const controllerParams = [
                        channel,
                        publisher_queue,
                        ws,
                        parsedMessage.message,
                        parsedMessage.params
                    ];
                    switch (parsedMessage.type) {
                        case "request":
                            (0, controller_1.default)(...controllerParams);
                            break;
                        case "ping":
                            ws.send(JSON.stringify({ type: "ping", message: "Hello Client" }));
                            break;
                        default:
                            ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
                            break;
                    }
                });
            });
            console.log('Websocket Server Running');
        }
        catch (error) {
            console.log("Error occured during startup:", error);
        }
    });
})();
