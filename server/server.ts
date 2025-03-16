import WebSocket from 'ws';
import wsController from './controllers/controller';
import db from './config/dbConfig';
import amqp, { Channel, Message } from 'amqplib'

const clients: Map<string, WebSocket> = new Map();

const port = 8080

const username = process.env.RABBITMQ_USER;
const password = process.env.RABBITMQ_PASS;
const rbmqPort = process.env.RABBITMQ_PORT;
const RABBIT_URL = `amqp://${username}:${password}@rabbitmq:${rbmqPort}`;

const wss = new WebSocket.Server({ port: port});

(async function startServer() {
    try {
        console.log("Starting Server...");

        // Database Sync
        try {
            await db.sync({ force: false, logging: false });
            console.log('Database synced and connection established');
        } catch (error) {
            console.error('Unable to sync Database: ', error);
        }

        // RabbitMQ Sync
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const consumer_queue = 'server_queue';
        const publisher_queue = 'serial_queue';

        await channel.assertQueue(consumer_queue, { durable: true });

        connection.on('close', () => {
            console.error('RabbitMQ connection closed unexpectedly');
        });
        console.log('RabbitMQ connection established');

        // Websocket Server Sync
        wss.on('connection', (ws) => {

            // Client Request Type Handling
            ws.on('message', (message) => {
                console.log('received: %s', message);
                const parsedMessage = JSON.parse(message.toString());

                if (parsedMessage.clientId) {
                    clients.set(parsedMessage.clientId, ws);
                }

                const controllerParams: [Channel, string, WebSocket, string, string] = [
                    channel,
                    publisher_queue,
                    ws,
                    parsedMessage.message,
                    parsedMessage.params
                ]
        
                switch(parsedMessage.type) {
                    case "request":
                        wsController(...controllerParams);
                        break;
                        
                    case "ping":
                        ws.send(JSON.stringify({ type: "ping", message: "Hello Client" }));
                        break;

                    default:
                        ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
                        break;
                }
            });

            ws.on('close', () => {
                clients.forEach((value, key) => {
                    if (value === ws) {
                        clients.delete(key);
                    }
                });
                console.log("WebSocket Disconnected");
            });

        });
        console.log('Websocket Server Running');

        // Establish Listener for Cubesat Response Handling
        channel.consume(consumer_queue, (msg: Message | null) => {
            if (msg !== null) {
                const message = msg.content.toString()
                console.log('Received:', message);
                channel.ack(msg);

                try {
                    const parsedMessage = JSON.parse(message);

                    console.log(clients);
                    console.log(parsedMessage.clientId)

                    if (parsedMessage.clientId && clients.has(parsedMessage.clientId)) {
                        const ws = clients.get(parsedMessage.clientId);
                        if (ws && ws.readyState === WebSocket.OPEN) {

                            const controllerParams: [Channel, string, WebSocket, string, string] = [
                                channel,
                                publisher_queue,
                                ws,
                                parsedMessage.message,
                                parsedMessage.params
                            ]
        
                            switch(parsedMessage.type) {
                                case "response":
                                    wsController(...controllerParams);
                                    break;
                                    
                                case "ping":
                                    channel.sendToQueue(publisher_queue, Buffer.from("Ping received by server"));
                                    break;
        
                                default:
                                    channel.sendToQueue(publisher_queue, Buffer.from("Invalid Message Type, rejecting message"));
                                    break;
                            }

                        }
                    } else {
                        console.warn("No matching WebSocket client found for message:", parsedMessage);
                    }

                } catch (error) {
                    console.error('Error while handling message: ', error);
                }
            } else {
                console.log('Message is null, Consumer cancelled by server');
            }
        });
        console.log('Consumer Running');

    } catch(error) {
        console.log("Error occured during startup:", error)
    }
})();