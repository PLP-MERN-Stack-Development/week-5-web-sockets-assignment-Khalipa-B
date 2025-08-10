import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Send, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ChatUI({ socket, username }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateChats, setPrivateChats] = useState({});
  const [currentChat, setCurrentChat] = useState("global");
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [notifications, setNotifications] = useState({});

  useEffect(() => {
    socket.on("online_users", setOnlineUsers);

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("private_message", ({ from, message, timestamp }) => {
      setPrivateChats((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { from, message, timestamp }]
      }));
      setNotifications((prev) => ({
        ...prev,
        [from]: (prev[from] || 0) + 1
      }));
    });

    socket.on("typing", ({ from }) => {
      if (!typingUsers.includes(from)) {
        setTypingUsers((prev) => [...prev, from]);
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== from));
        }, 2000);
      }
    });

    socket.on("notification", ({ from }) => {
      if (currentChat !== from) {
        setNotifications((prev) => ({
          ...prev,
          [from]: (prev[from] || 0) + 1
        }));
      }
    });

    return () => {
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("private_message");
      socket.off("typing");
      socket.off("notification");
    };
  }, [socket, currentChat, typingUsers]);

  const sendMessage = () => {
    if (!input.trim()) return;
    if (currentChat === "global") {
      socket.emit("send_message", { from: username, message: input });
    } else {
      socket.emit("private_message", {
        from: username,
        to: currentChat,
        message: input
      });
      setPrivateChats((prev) => ({
        ...prev,
        [currentChat]: [
          ...(prev[currentChat] || []),
          { from: username, message: input, timestamp: new Date().toISOString() }
        ]
      }));
    }
    setInput("");
  };

  const startTyping = () => {
    socket.emit("typing", { from: username, to: currentChat === "global" ? null : currentChat });
  };

  const switchChat = (user) => {
    setCurrentChat(user);
    setNotifications((prev) => {
      const updated = { ...prev };
      delete updated[user];
      return updated;
    });
  };

  const currentMessages =
    currentChat === "global" ? messages : privateChats[currentChat] || [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Card className="w-1/4 rounded-none border-r flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Online Users</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div
            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
              currentChat === "global" ? "bg-blue-100" : "hover:bg-gray-100"
            }`}
            onClick={() => switchChat("global")}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <Globe size={14} />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">Global Chat</span>
          </div>
          {onlineUsers
            .filter((u) => u !== username)
            .map((user) => (
              <div
                key={user}
                onClick={() => switchChat(user)}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                  currentChat === user ? "bg-blue-100" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{user}</span>
                </div>
                {notifications[user] && (
                  <Badge variant="destructive">{notifications[user]}</Badge>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 rounded-none flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {currentChat === "global" ? "🌍 Global Chat" : `💬 Chat with ${currentChat}`}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[calc(100vh-160px)] p-4">
            {currentMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-3 max-w-[70%] ${
                  msg.from === username ? "ml-auto text-right" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    msg.from === username
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <div className="text-sm font-semibold">{msg.from}</div>
                  <div>{msg.message}</div>
                  <div className="text-[10px] opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {typingUsers.length > 0 && (
              <div className="text-sm text-gray-500">
                {typingUsers.join(", ")} is typing...
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex gap-2 border-t p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={startTyping}
            placeholder="Type your message..."
          />
          <Button onClick={sendMessage}>
            <Send size={16} className="mr-1" /> Send
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
