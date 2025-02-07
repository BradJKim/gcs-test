import WebSocket from "ws";
import { createCubesat } from "../services/db";

export default function wsController(ws: WebSocket, message: string): void {

    /* FUNCTIONS */

    /**
     * db request add it
     */
    const addCubesat = async () => {
        let response = await createCubesat();
        response = await response;
        const result = JSON.parse(response);

        if(result.status === 'success') {
            ws.send(JSON.stringify({ type: "success", message: "Created Cubesat" }));
        } else if (result.status === 'failure') {
            ws.send(JSON.stringify({ type: "failure", message: `Unable to create Cubesat: ${result.message}` }));
        }
    }

    /* ROUTING */

    if(message === 'add') {
        addCubesat()
    }
    else if (message === 'remove') {
        //removeCubesat()
        ws.send(JSON.stringify({ type: "success", message: "Removed Cubesat" }));
    }
    else {
        ws.send(JSON.stringify({ type: "error", message: "Unknown request" }));
    }
    
}