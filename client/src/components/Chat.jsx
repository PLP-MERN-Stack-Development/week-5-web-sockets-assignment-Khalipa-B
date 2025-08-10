import React, { useState, useEffect, useContext, useRef } from 'react';
import { SocketContext } from '../context/SocketContext';

export default function Chat({ username }) {
  const socket = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('private_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('typing', ({ from }) => {
      if (from !== username && !typingUsers.includes(from)) {
        setTypingUsers((prev) => [...prev, from]);
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== from));
        }, 3000);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('private_message');
      socket.off('online_users');
      socket.off('typing');
    };
  }, [socket, typingUsers, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (messageText.trim()) {
      socket.emit('send_message', { text: messageText }, (response) => {
        if (response.success) {
          setMessageText('');
        }
      });
    }
  };

  const handleTyping = () => {
    socket.emit('typing', {});
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-screen p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Chatterbox</h1>
        <p>Logged in as: <strong>{username}</strong></p>
      </div>
      <div className="flex gap-6">
        <div className="w-1/4 border rounded p-2">
          <h2 className="font-semibold mb-2">Online Users</h2>
          <ul>
            {onlineUsers.map((user) => (
              <li key={user} className={user === username ? 'font-bold' : ''}>{user}</li>
            ))}
          </ul>
        </div>
        <div className="flex-1 flex flex-col border rounded p-2">
          <div className="flex-1 overflow-y-auto mb-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-2 p-2 rounded ${
                  msg.from === username ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'
                }`}
              >
                <strong>{msg.from}:</strong> {msg.text}
                <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-grow border rounded p-2"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
                else handleTyping();
              }}
              placeholder="Type a message..."
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={sendMessage}
              disabled={!messageText.trim()}
            >
              Send
            </button>
          </div>
          {typingUsers.length > 0 && (
            <div className="text-sm italic text-gray-600 mt-1">
              {typingUsers.join(', ')} typing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
