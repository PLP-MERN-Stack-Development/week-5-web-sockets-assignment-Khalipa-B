import React, { useState } from 'react';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Chat from './components/Chat';

export default function App() {
  const [username, setUsername] = useState('');

  return (
    <SocketProvider>
      {!username ? <Login onLogin={setUsername} /> : <Chat username={username} />}
    </SocketProvider>
  );
}
