"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var ws_1 = require("ws");
//const morgan = require('morgan');
// Create a new express application instance
var app = express_1.default();
// app.use(bodyParser.json());
app.use(express_1.default.json({ limit: 300000 }));
var PORT = 3010;
var wss = new ws_1.WebSocketServer({ port: PORT });
wss.on('connection', function connection(ws) {
    console.log("CONNECTED");
    //   ws.on('message', function message(data) {
    //     console.log('received: %s', data);
    //   });
    //   ws.send('something');
});
