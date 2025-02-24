import WebSocket from 'ws';
import wsController from './controllers/controller';
import db from './config/dbConfig';
import amqp, { Channel } from 'amqplib'

const port = 8080

const username = process.env.RABBITMQ_USER;
const password = process.env.RABBITMQ_PASS;
const rbmqPort = process.env.RABBITMQ_PORT;
const RABBIT_URL = `amqp://${username}:${password}@rabbitmq:${rbmqPort}`;

const wss = new WebSocket.Server({ port: port});

(async function startServer() {
    try {
        console.log("Starting Server...");

        // RabbitMQ Sync
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = 'server_queue';
        connection.on('close', () => {
            console.error('RabbitMQ connection closed unexpectedly');
        });
        console.log('RabbitMQ connection established');

        // Database Sync
        try {
            await db.sync({ force: false, logging: false });
            console.log('Database synced and connection established');
        } catch (error) {
            console.error('Unable to sync Database: ', error);
        }

        // Server Sync
        wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());

                const controllerParams: [Channel, string, WebSocket, string, string] = [
                    channel,
                    queue,
                    ws,
                    parsedMessage.message,
                    parsedMessage.params
                ]
        
                // Client Request Type Handling
                switch(parsedMessage.type) {
                    case "request":
                        console.log('received: %s', message);
                        wsController(...controllerParams);
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

    } catch(error) {
        console.log("Error occured during startup:", error)
    }
})();