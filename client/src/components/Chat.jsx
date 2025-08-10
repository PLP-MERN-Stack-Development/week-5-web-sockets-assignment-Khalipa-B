import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ socket, username }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [privateUser, setPrivateUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('join_room', 'global', ({ lastMessages }) => {
      setMessages(lastMessages);
    });

    socket.on('online_users', users => setOnlineUsers(users.filter(u => u !== username)));

    socket.on('new_message', msg => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('private_message', msg => {
      setMessages(prev => [...prev, msg]);
      if (Notification.permission === 'granted') {
        new Notification(`Private message from ${msg.from}`);
      }
    });

    socket.on('typing', ({ from }) => {
      setTypingUsers(prev => ({ ...prev, [from]: true }));
      setTimeout(() => {
        setTypingUsers(prev => {
          const copy = { ...prev };
          delete copy[from];
          return copy;
        });
      }, 1000);
    });

    return () => {
      socket.off('online_users');
      socket.off('new_message');
      socket.off('private_message');
      socket.off('typing');
    };
  }, [socket, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const payload = {
      from: username,
      text: input,
      room: privateUser ? 'private' : 'global',
      to: privateUser,
    };

    socket.emit('send_message', payload);
    setMessages(prev => [...prev, { ...payload, timestamp: Date.now() }]);
    setInput('');
  };

  const startTyping = () => {
    socket.emit('typing', { from: username, to: privateUser });
  };

  return (
    <div className="flex h-screen max-w-7xl mx-auto bg-white shadow rounded overflow-hidden">
      <aside className="w-64 border-r p-4 bg-gray-50 flex flex-col">
        <h2 className="font-bold mb-4">Online Users</h2>
        <ul className="flex-grow overflow-auto">
          {onlineUsers.map(user => (
            <li
              key={user}
              className={`p-2 cursor-pointer rounded ${
                privateUser === user ? 'bg-indigo-200' : 'hover:bg-indigo-100'
              }`}
              onClick={() => setPrivateUser(user)}
            >
              {user}
            </li>
          ))}
        </ul>
        {privateUser && (
          <button
            className="mt-4 p-2 bg-red-500 text-white rounded"
            onClick={() => setPrivateUser(null)}
          >
            Leave Private Chat
          </button>
        )}
      </aside>

      <main className="flex flex-col flex-grow">
        <header className="border-b p-4 bg-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {privateUser ? `Chat with ${privateUser}` : 'Global Chat'}
          </h3>
          <p className="italic text-sm text-gray-600">You are: {username}</p>
        </header>

        <section className="flex-grow p-4 overflow-auto bg-gray-50">
          {messages
            .filter(msg =>
              privateUser
                ? (msg.from === username && msg.to === privateUser) || (msg.from === privateUser && msg.to === username)
                : !msg.to
            )
            .map((msg, i) => (
              <div
                key={i}
                className={`mb-2 max-w-xs p-2 rounded ${
                  msg.from === username ? 'bg-indigo-600 text-white ml-auto' : 'bg-white border'
                }`}
              >
                <div className="text-xs opacity-70">
                  <strong>{msg.from}</strong> <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </section>

        <footer className="p-4 border-t bg-gray-100 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-grow border p-2 rounded"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') sendMessage();
              else startTyping();
            }}
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </footer>

        <div className="p-2 text-sm text-gray-600 italic">
          {Object.keys(typingUsers).length > 0 && `${Object.keys(typingUsers).join(', ')} typing...`}
        </div>
      </main>
    </div>
  );
}
