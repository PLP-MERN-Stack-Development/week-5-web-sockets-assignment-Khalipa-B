import React, { useState } from "react";
import { io } from "socket.io-client";
import ChatUI from "./components/ChatUI";

const socket = io("http://localhost:5000");

export default function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit("join", username);
      setJoined(true);
    }
  };

  return joined ? (
    <ChatUI socket={socket} username={username} />
  ) : (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <input
          type="text"
          placeholder="Enter username..."
          className="border p-2 rounded mb-4 w-full"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          onClick={handleJoin}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Join Chat
        </button>
      </div>
    </div>
  );
}
