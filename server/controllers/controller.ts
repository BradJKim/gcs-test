import WebSocket from "ws";
import { createCubesat, updateCubesat } from "../services/db";
import { Channel } from "amqplib";

export default function wsController(channel: Channel, queue: string, ws: WebSocket, message: string, params: string): void {

    /* CONTROLLER FUNCTIONS */

    /**
     * Sends message to RabbitMQ
     */
    const sendMessage = () => {
        try {
            const MessageJSON: Message = JSON.parse(params);

            channel.sendToQueue(queue, Buffer.from(MessageJSON['message']));
            ws.send(JSON.stringify({ type: "success", message: "Message sent" }));
        } catch (err) {
            ws.send(JSON.stringify({ type: "failure", message: "Unable to send message" }));
        }
    }

    /**
     * DB request add cubesat
     */
    const addCubesat = async () => {
        const cubesatJson: Cubesat = JSON.parse(params);

        let response = await createCubesat(cubesatJson['id']);
        response = await response;
        const result = JSON.parse(response);

        if(result.status === 'success') {
            ws.send(JSON.stringify({ type: "success", message: "Created Cubesat" }));
        } else if (result.status === 'failure') {
            ws.send(JSON.stringify({ type: "failure", message: `Unable to create Cubesat: ${result.message}` }));
        }
    }

    /**
     * DB request update cubesat
     */
    const editCubesat = async () => {
        const cubesatJson: Cubesat = JSON.parse(params);

        const id = cubesatJson['id'];
        const name = cubesatJson['name'];

        let response = await updateCubesat(id, name);
        response = await response;
        const result = JSON.parse(response);

        if(result.status === 'success') {
            ws.send(JSON.stringify({ type: "success", message: "Created Cubesat" }));
        } else if (result.status === 'failure') {
            ws.send(JSON.stringify({ type: "failure", message: `Unable to create Cubesat: ${result.message}` }));
        }
    }

    /* ROUTING */

    if(message === 'send') {
        sendMessage();
    }
    else if(message === 'add') {
        addCubesat()
    }
    else if(message === 'update') {
        editCubesat()
    }
    /* else if (message === 'remove') {
        removeCubesat()
        ws.send(JSON.stringify({ type: "success", message: "Removed Cubesat" }));
    } */
    else { // message unknown
        ws.send(JSON.stringify({ type: "error", message: "Unknown request" }));
    }
    
}