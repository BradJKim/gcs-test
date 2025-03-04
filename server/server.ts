import WebSocket from 'ws';
import wsController from './controllers/controller';
import db from './config/dbConfig';
import amqp, { Channel, Message } from 'amqplib'

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
        const consumer_queue = 'server_queue';
        const publisher_queue = 'serial_queue';

        await channel.assertQueue(consumer_queue);

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

        // Websocket Server Sync
        wss.on('connection', (ws) => {

            // Establish Listener for Cubesat Response Handling
            channel.consume(consumer_queue, (msg: Message | null) => {
                if (msg !== null) {
                    const message = msg.content.toString()
                    console.log('Received:', message);
                    channel.ack(msg);

                    const parsedMessage = JSON.parse(message);

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

                } else {
                    console.log('Consumer cancelled by server');
                }
            });

            // Client Request Type Handling
            ws.on('message', (message) => {
                console.log('received: %s', message);
                const parsedMessage = JSON.parse(message.toString());

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
        });
        console.log('Websocket Server Running');

    } catch(error) {
        console.log("Error occured during startup:", error)
    }
})();