import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
});

// In-memory stores (demo)
const online = {}; // socketId -> username
const sockets = {}; // username -> socketId
const messages = { global: [] }; // room -> [msg]

function saveMessage(room, msg) {
  if (!messages[room]) messages[room] = [];
  messages[room].push(msg);
  if (messages[room].length > 1000) messages[room].shift();
}

io.on('connection', (socket) => {
  console.log('connected', socket.id);

  socket.on('set_username', (username, ack) => {
    online[socket.id] = username;
    sockets[username] = socket.id;
    // broadcast updated list
    io.emit('online_users', Object.values(online));
    if (ack) ack({ ok: true });
  });

  socket.on('join_room', ({ room }, ack) => {
    socket.join(room);
    if (!messages[room]) messages[room] = [];
    if (ack) ack({ lastMessages: messages[room].slice(-50) });
  });

  socket.on('send_message', (payload, ack) => {
    // payload: { room, from, text, to (optional), tempId, imageUrl }
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      from: payload.from,
      text: payload.text || null,
      imageUrl: payload.imageUrl || null,
      to: payload.to || null,
      room: payload.room || 'global',
      timestamp: Date.now(),
      status: 'sent'
    };

    // save to room
    saveMessage(msg.room, msg);

    if (msg.to) {
      // private: emit only to recipient and sender
      const toSocket = sockets[msg.to];
      if (toSocket) io.to(toSocket).emit('private_message', msg);
      socket.emit('private_message', msg); // echo to sender
      // also emit notification to recipient
      if (toSocket) io.to(toSocket).emit('notification', { type: 'message', from: msg.from });
    } else {
      // room message
      io.to(msg.room).emit('new_message', msg);
    }

    if (ack) ack({ ok: true, serverId: msg.id, timestamp: msg.timestamp });
  });

  socket.on('typing', ({ room, from, to }) => {
    if (to) {
      const toSocket = sockets[to];
      if (toSocket) io.to(toSocket).emit('typing', { from, to: true });
    } else {
      socket.to(room || 'global').emit('typing', { from, to: null });
    }
  });

  socket.on('message_read', ({ messageId, room, by }) => {
    // mark message read in memory (simple)
    const list = messages[room] || [];
    const m = list.find(x => x.id === messageId);
    if (m) m.status = 'read';
    // notify sender
    const senderSocket = sockets[m?.from];
    if (senderSocket) io.to(senderSocket).emit('message_read', { messageId, by });
  });

  socket.on('disconnect', () => {
    const username = online[socket.id];
    if (username) {
      delete sockets[username];
    }
    delete online[socket.id];
    io.emit('online_users', Object.values(online));
    if (username) io.emit('user_left', username);
    console.log('disconnected', socket.id);
  });
});

app.get('/', (req, res) => res.send('Chatterbox server running'));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server listening on ${PORT}`));