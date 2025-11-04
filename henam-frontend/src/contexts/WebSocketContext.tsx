import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppSelector } from '../hooks/redux';
import { websocketService } from '../services/websocketService';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (type: string, listener: (data: any) => void) => () => void;
  send: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, accessToken } = useAppSelector((state) => state.auth);

  useEffect(() => {
    let interval: number | null = null;
    let mounted = true;

    if (isAuthenticated && accessToken) {
      console.log('🔌 WebSocket: User authenticated, connecting...');

      // Connect when authenticated (gracefully handle failures)
      try {
        websocketService.connect();
        if (mounted) {
          setIsConnected(websocketService.isConnected());
        }
      } catch (error) {
        console.warn('WebSocket connection failed:', error);
      }

      // Check connection status periodically (less frequently to reduce churn)
      interval = setInterval(() => {
        if (mounted) {
          const connected = websocketService.isConnected();
          setIsConnected(connected);
          
          // Only attempt reconnect if we're supposed to be connected but aren't
          if (!connected && isAuthenticated) {
            console.log('🔄 WebSocket disconnected, attempting reconnect...');
            try {
              websocketService.connect();
            } catch (error) {
              console.warn('WebSocket reconnect failed:', error);
            }
          }
        }
      }, 15000); // Increased from 5s to 15s to reduce connection churn

    } else {
      // Disconnect when not authenticated
      console.log('🔌 WebSocket: User not authenticated, disconnecting...');
      try {
        websocketService.disconnect();
      } catch (error) {
        console.warn('WebSocket disconnect error:', error);
      }
      if (mounted) {
        setIsConnected(false);
      }
    }

    // Cleanup interval on unmount or auth change
    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated, accessToken]);

  const subscribe = (type: string, listener: (data: any) => void) => {
    return websocketService.subscribe(type, listener);
  };

  const send = (message: any) => {
    websocketService.send(message);
  };

  const value: WebSocketContextType = {
    isConnected,
    subscribe,
    send,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
