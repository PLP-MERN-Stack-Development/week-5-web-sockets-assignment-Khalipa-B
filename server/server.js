import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import config from './config/index.js';
import { socketHandler } from './socket/socketHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
});

socketHandler(io);

app.get('/', (req, res) => {
  res.send('Chatterbox server is running');
});

server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
