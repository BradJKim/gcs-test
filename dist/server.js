"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes/routes"));
const app = (0, express_1.default)();
const port = 8080;
//app.use(express.json())
//app.use(express.urlencoded({extended: true}))
/* app.get('/', (req: Request, res: Response) => {
    //req.params()
    res.send('Hello World!')
}) */
(0, routes_1.default)(app);
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
