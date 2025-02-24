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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = wsController;
const db_1 = require("../services/db");
function wsController(channel, queue, ws, message, params) {
    /* CONTROLLER FUNCTIONS */
    /**
     * Sends message to RabbitMQ
     */
    const sendMessage = () => {
        try {
            const MessageJSON = JSON.parse(params);
            channel.sendToQueue(queue, Buffer.from(MessageJSON['message']));
            ws.send(JSON.stringify({ type: "success", message: "Message sent" }));
        }
        catch (err) {
            ws.send(JSON.stringify({ type: "failure", message: "Unable to send message" }));
        }
    };
    /**
     * DB request add cubesat
     */
    const addCubesat = () => __awaiter(this, void 0, void 0, function* () {
        const cubesatJson = JSON.parse(params);
        let response = yield (0, db_1.createCubesat)(cubesatJson['id']);
        response = yield response;
        const result = JSON.parse(response);
        if (result.status === 'success') {
            ws.send(JSON.stringify({ type: "success", message: "Created Cubesat" }));
        }
        else if (result.status === 'failure') {
            ws.send(JSON.stringify({ type: "failure", message: `Unable to create Cubesat: ${result.message}` }));
        }
    });
    /* ROUTING */
    if (message === 'send') {
        sendMessage();
    }
    else if (message === 'add') {
        addCubesat();
    }
    else if (message === 'remove') {
        //removeCubesat()
        ws.send(JSON.stringify({ type: "success", message: "Removed Cubesat" }));
    }
    else { // message unknown
        ws.send(JSON.stringify({ type: "error", message: "Unknown request" }));
    }
}
