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
exports.createCubesat = createCubesat;
exports.getAllCubesats = getAllCubesats;
exports.deleteCubesat = deleteCubesat;
const cubesat_1 = __importDefault(require("../models/cubesat"));
function createCubesat() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield cubesat_1.default.create({
                id: 1,
                name: 'drone'
            });
            return JSON.stringify({ status: 'success', message: 'Cubesat created successfully' });
        }
        catch (error) {
            return JSON.stringify({ status: 'failure', message: `Cubesat creation unsuccessfull: ${error}` });
        }
    });
}
function getAllCubesats() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield cubesat_1.default.findAll();
            return JSON.stringify({ status: 'success', message: 'Cubesat created successfully', data: result });
        }
        catch (error) {
            return JSON.stringify({ status: 'failure', message: `Cubesat creation unsuccessfull: ${error}` });
        }
    });
}
function deleteCubesat() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield cubesat_1.default.destroy({
                where: { name: 'drone' }
            });
            return JSON.stringify({ status: 'success', message: 'Cubesat created successfully' });
        }
        catch (error) {
            return JSON.stringify({ status: 'failure', message: `Cubesat creation unsuccessfull: ${error}` });
        }
    });
}
