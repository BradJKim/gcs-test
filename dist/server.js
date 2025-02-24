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
            // RabbitMQ Sync
            const connection = yield amqplib_1.default.connect(RABBIT_URL);
            const channel = yield connection.createChannel();
            const queue = 'server_queue';
            connection.on('close', () => {
                console.error('RabbitMQ connection closed unexpectedly');
            });
            console.log('RabbitMQ connection established');
            // Database Sync
            try {
                yield dbConfig_1.default.sync({ force: false, logging: false });
                console.log('Database synced and connection established');
            }
            catch (error) {
                console.error('Unable to sync Database: ', error);
            }
            // Server Sync
            wss.on('connection', (ws) => {
                ws.on('message', (message) => {
                    const parsedMessage = JSON.parse(message.toString());
                    const controllerParams = [
                        channel,
                        queue,
                        ws,
                        parsedMessage.message,
                        parsedMessage.params
                    ];
                    // Client Request Type Handling
                    switch (parsedMessage.type) {
                        case "request":
                            console.log('received: %s', message);
                            (0, controller_1.default)(...controllerParams);
                            break;
                        case "ping":
                            console.log('received: %s', message);
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
