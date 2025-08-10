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
});

const onlineUsers = {};
const socketsByUsername = {};
const messages = { global: [] };

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('set_username', (username, ack) => {
    onlineUsers[socket.id] = username;
    socketsByUsername[username] = socket.id;
    io.emit('online_users', Object.values(onlineUsers));
    ack({ ok: true });
  });

  socket.on('join_room', (room, ack) => {
    socket.join(room);
    if (!messages[room]) messages[room] = [];
    ack({ lastMessages: messages[room].slice(-50) });
  });

  socket.on('send_message', (payload, ack) => {
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: payload.from,
      text: payload.text || null,
      to: payload.to || null,
      room: payload.room || 'global',
      timestamp: Date.now(),
      status: 'sent'
    };

    if (!messages[msg.room]) messages[msg.room] = [];
    messages[msg.room].push(msg);

    if (msg.to) {
      // Private message to sender and recipient only
      const toSocketId = socketsByUsername[msg.to];
      if (toSocketId) io.to(toSocketId).emit('private_message', msg);
      socket.emit('private_message', msg);
    } else {
      // Broadcast to room
      io.to(msg.room).emit('new_message', msg);
    }

    if (ack) ack({ ok: true, serverId: msg.id, timestamp: msg.timestamp });
  });

  socket.on('typing', ({ room, from, to }) => {
    if (to) {
      const toSocketId = socketsByUsername[to];
      if (toSocketId) io.to(toSocketId).emit('typing', { from });
    } else {
      socket.to(room).emit('typing', { from });
    }
  });

  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    delete socketsByUsername[username];
    delete onlineUsers[socket.id];
    io.emit('online_users', Object.values(onlineUsers));
    io.emit('user_left', username);
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get('/', (req, res) => res.send('Chatterbox Server Running'));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
