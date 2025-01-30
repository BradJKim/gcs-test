import WebSocket from 'ws';

const port = 8080
const wss = new WebSocket.Server({ port: port});

wss.on('connection', function connection(ws) { // Advanced WS Server - https://ably.com/blog/websockets-react-tutorial
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send('Message Received');
});

console.log('Websocket Server Running');
