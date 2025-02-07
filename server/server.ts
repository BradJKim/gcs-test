import WebSocket from 'ws';
import { Message } from 'amqplib/callback_api'
import wsController from './controllers/controller';
import db from './config/dbConfig';
import { rbmqChannel } from './services/rbmq';

const port = 8080
const wss = new WebSocket.Server({ port: port});

const channel = rbmqChannel;

db.sync({ force: false }).then(() => {
    console.log('Database Synced!');
}).catch((error) => {
    console.error('Unable to sync Database : ', error);
}).then(() => {
    wss.on('connection', (ws) => { // Advanced WS Server - https://ably.com/blog/websockets-react-tutorial
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
        
                switch(parsedMessage.type) {
                    case "request":
                        console.log('received: %s', message);
                        wsController(ws, parsedMessage.message);
                        break;
        
                    case "ping":
                        console.log('received: %s', message);
                        ws.send(JSON.stringify({ type: "ping", message: "Hello Client" }));
                        break;

                    default:
                        ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
                        break;
                }
            } catch(error) {
                ws.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
            }
        });
    });

    listenToRabbitMQ();
    console.log('Listening to RabbitMQ');

    console.log('Websocket Server Running');
});

function listenToRabbitMQ() {
    if (channel) {
        channel.consume('websocket_queue', (msg: Message | null) => {
            if(msg) {
                const message = msg.content.toString();
                console.log('Received message from RabbitMQ:', message);
        
                // Broadcast the message to all connected WebSocket clients
                /* wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }); */
        
                // Acknowledge the message
                channel.ack(msg);
            } else {
                console.log("Message is Null");
            }
        });
    }
}