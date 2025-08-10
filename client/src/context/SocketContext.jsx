import React, { createContext } from 'react';
import { socket } from '../socket/socket';

export const SocketContext = createContext();

export function SocketProvider({ children }) {
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
