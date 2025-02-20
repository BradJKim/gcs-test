"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const controller_1 = __importDefault(require("./controllers/controller"));
const dbConfig_1 = __importDefault(require("./config/dbConfig"));
const rbmq_1 = require("./services/rbmq");
const port = 8080;
const wss = new ws_1.default.Server({ port: port });
dbConfig_1.default.sync({ force: false }).then(() => {
    console.log('Database Synced!');
}).catch((error) => {
    console.error('Unable to sync Database : ', error);
}).then(() => {
    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                switch (parsedMessage.type) {
                    case "request":
                        console.log('received: %s', message);
                        (0, controller_1.default)(ws, parsedMessage.message, parsedMessage.params);
                        break;
                    case "ping":
                        console.log('received: %s', message);
                        ws.send(JSON.stringify({ type: "ping", message: "Hello Client" }));
                        break;
                    default:
                        ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
                        break;
                }
            }
            catch (error) {
                ws.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
            }
        });
    });
    listenToRabbitMQ();
    console.log('Listening to RabbitMQ');
    console.log('Websocket Server Running');
});
function listenToRabbitMQ() {
    if (rbmq_1.rbmqChannel) {
        rbmq_1.rbmqChannel.consume('websocket_queue', (msg) => {
            if (msg) {
                const message = msg.content.toString();
                console.log('Received message from RabbitMQ:', message);
                // Broadcast the message to all connected WebSocket clients
                /* wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }); */
                // Acknowledge the message
                rbmq_1.rbmqChannel.ack(msg);
            }
            else {
                console.log("Message is Null");
            }
        });
    }
}
