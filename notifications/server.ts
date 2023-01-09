import logger from './config/winston';
import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
//const morgan = require('morgan');

// Create a new express application instance
const app: express.Application = express();
// app.use(bodyParser.json());
app.use(express.json({ limit: 300000 }));

const PORT:number = 3010;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', function connection(ws) {
  console.log("CONNECTED");
  ws.on('message', function message(data, isBinary) {
    console.log('received: %s', data);
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        console.log("SENDING", data.toString());
        client.send(data, { binary: isBinary });
      }
    });
  });

  //ws.send('something');
});
