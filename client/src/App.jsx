import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Chat from './components/Chat.jsx';

const socket = io('http://localhost:5000');

export default function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit('set_username', username, () => setJoined(true));
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex items-center justify-center">
      {!joined ? (
        <div className="bg-white p-6 rounded shadow w-96">
          <h2 className="text-2xl mb-4 font-bold">Join Chatterbox</h2>
          <input
            type="text"
            placeholder="Enter username"
            className="w-full p-2 border rounded mb-4"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            className="w-full bg-indigo-600 text-white py-2 rounded"
            onClick={handleJoin}
          >
            Join
          </button>
        </div>
      ) : (
        <Chat socket={socket} username={username} />
      )}
    </div>
  );
}
