const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join", (username) => {
    onlineUsers.set(socket.id, username);
    io.emit("online_users", Array.from(onlineUsers.values()));
  });

  socket.on("send_message", (data) => {
    io.emit("receive_message", { ...data, timestamp: new Date() });
  });

  socket.on("private_message", ({ from, to, message }) => {
    const targetSocketId = [...onlineUsers.entries()]
      .find(([_, name]) => name === to)?.[0];
    if (targetSocketId) {
      io.to(targetSocketId).emit("private_message", {
        from, message, timestamp: new Date()
      });
    }
  });

  socket.on("typing", ({ from, to }) => {
    if (to) {
      const targetSocketId = [...onlineUsers.entries()]
        .find(([_, name]) => name === to)?.[0];
      if (targetSocketId) io.to(targetSocketId).emit("typing", { from });
    } else {
      socket.broadcast.emit("typing", { from });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online_users", Array.from(onlineUsers.values()));
    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
