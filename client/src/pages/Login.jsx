import React, { useState, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

export default function Login({ onLogin }) {
  const socket = useContext(SocketContext);
  const [username, setUsername] = useState('');

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('set_username', username, (response) => {
        if (response.success) {
          onLogin(username);
        }
      });
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-4">Enter your username</h2>
      <input
        type="text"
        className="border p-2 w-full mb-4"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      />
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
        Join Chat
      </button>
    </div>
  );
}
