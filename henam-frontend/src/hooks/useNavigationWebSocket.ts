import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';

/**
 * Hook to manage WebSocket subscriptions during navigation
 * Prevents duplicate subscriptions and properly cleans up
 */
export const useNavigationWebSocket = () => {
  const location = useLocation();
  const { subscribe, isConnected } = useWebSocket();
  const activeSubscriptions = useRef<Map<string, () => void>>(new Map());
  const currentPath = useRef<string>('');

  useEffect(() => {
    // Clean up subscriptions when navigating away from a page
    if (currentPath.current && currentPath.current !== location.pathname) {
      console.log(`🧹 Cleaning up WebSocket subscriptions for ${currentPath.current}`);
      
      // Unsubscribe from page-specific subscriptions
      activeSubscriptions.current.forEach((unsubscribe, key) => {
        if (key.startsWith(currentPath.current)) {
          console.log(`🔌 Unsubscribing from: ${key}`);
          unsubscribe();
          activeSubscriptions.current.delete(key);
        }
      });
    }
    
    currentPath.current = location.pathname;
  }, [location.pathname]);

  // Clean up all subscriptions on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up all WebSocket subscriptions on unmount');
      activeSubscriptions.current.forEach((unsubscribe) => {
        unsubscribe();
      });
      activeSubscriptions.current.clear();
    };
  }, []);

  const subscribeToUpdates = (
    type: string, 
    listener: (data: any) => void,
    pageSpecific: boolean = true
  ) => {
    if (!isConnected) {
      console.log(`⚠️ WebSocket not connected, skipping subscription to ${type}`);
      return () => {}; // Return empty unsubscribe function
    }

    const subscriptionKey = pageSpecific 
      ? `${location.pathname}-${type}` 
      : `global-${type}`;

    // Check if already subscribed
    if (activeSubscriptions.current.has(subscriptionKey)) {
      console.log(`⏭️ Already subscribed to ${type} for ${location.pathname}`);
      return activeSubscriptions.current.get(subscriptionKey)!;
    }

    console.log(`🔌 Subscribing to ${type} for ${location.pathname}`);
    const unsubscribe = subscribe(type, listener);
    
    // Store the unsubscribe function
    activeSubscriptions.current.set(subscriptionKey, unsubscribe);

    // Return unsubscribe function that also cleans up our tracking
    return () => {
      console.log(`🔌 Unsubscribing from ${type} for ${location.pathname}`);
      unsubscribe();
      activeSubscriptions.current.delete(subscriptionKey);
    };
  };

  return {
    subscribeToUpdates,
    isConnected,
    currentPath: location.pathname
  };
};