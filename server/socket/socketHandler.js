const onlineUsers = new Map();

export function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('set_username', (username, callback) => {
      onlineUsers.set(socket.id, username);
      io.emit('online_users', Array.from(onlineUsers.values()));
      callback({ success: true });
    });

    socket.on('send_message', (message, callback) => {
      const from = onlineUsers.get(socket.id) || 'Anonymous';
      const msg = {
        id: Date.now(),
        text: message.text,
        from,
        to: message.to || null,
        timestamp: new Date(),
      };
      // Broadcast message globally or privately
      if (msg.to) {
        // Private message
        for (const [sockId, username] of onlineUsers.entries()) {
          if (username === msg.to) {
            io.to(sockId).emit('private_message', msg);
            break;
          }
        }
        socket.emit('private_message', msg);
      } else {
        io.emit('new_message', msg);
      }
      callback({ success: true });
    });

    socket.on('typing', ({ to }) => {
      if (to) {
        for (const [sockId, username] of onlineUsers.entries()) {
          if (username === to) {
            io.to(sockId).emit('typing', { from: onlineUsers.get(socket.id) });
            break;
          }
        }
      } else {
        socket.broadcast.emit('typing', { from: onlineUsers.get(socket.id) });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      onlineUsers.delete(socket.id);
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
  });
}
