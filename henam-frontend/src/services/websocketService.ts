import { store } from '../store';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionId: string | null = null;
  private sessionId: string | null = null;

  connect() {
    // Create session ID if not exists (persists across navigation)
    if (!this.sessionId) {
      this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🆔 Created WebSocket session: ${this.sessionId}`);
    }

    // Prevent multiple connections within same session
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log(`WebSocket already connected for session ${this.sessionId}, skipping...`);
      return;
    }

    // Close any existing connection first
    if (this.ws) {
      console.log('Closing existing WebSocket connection...');
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = true;
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://henam.linkpc.net/ws';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connectionId = `${this.sessionId}-${Date.now()}`;
        console.log(`✅ WebSocket connected successfully (Session: ${this.sessionId}, Connection: ${this.connectionId})`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send authentication token if available
        const token = localStorage.getItem('access_token');
        if (token) {
          this.send({
            type: 'auth',
            data: {
              token,
              connectionId: this.connectionId,
              sessionId: this.sessionId
            }
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;

        // Only attempt reconnect if it wasn't a clean close
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        console.warn('⚠️ WebSocket connection failed - this is normal if backend is not running');
        this.isConnecting = false;
        // Don't attempt reconnect on initial connection failure
        if (this.reconnectAttempts === 0) {
          console.log('💡 WebSocket is optional - app will work without real-time updates');
        }
      };

    } catch (error) {
      console.warn('⚠️ WebSocket connection error:', (error as Error).message);
      this.isConnecting = false;
      // Only attempt reconnect if we had a previous successful connection
      if (this.reconnectAttempts > 0) {
        this.attemptReconnect();
      }
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
    } else {
      console.log('🛑 Max WebSocket reconnection attempts reached - app will continue without real-time updates');
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('WebSocket message received:', message);

    // Handle different message types
    switch (message.type) {
      case 'job_created':
      case 'job_updated':
      case 'job_deleted':
        this.notifyListeners('job_update', message.data);
        // Use debounced invalidation to prevent excessive refetches
        this.debouncedInvalidate(['Job', 'Dashboard']);
        break;

      case 'task_created':
      case 'task_updated':
      case 'task_deleted':
        this.notifyListeners('task_update', message.data);
        // Use debounced invalidation to prevent excessive refetches
        this.debouncedInvalidate(['Task', 'Dashboard']);
        break;

      case 'notification':
        this.notifyListeners('notification', message.data);
        // Use debounced invalidation to prevent excessive refetches
        this.debouncedInvalidate(['Notification']);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private invalidateTimers: Map<string, number> = new Map();

  private debouncedInvalidate(tags: string[], delay: number = 1000) {
    const key = tags.join(',');

    // Clear existing timer for these tags
    if (this.invalidateTimers.has(key)) {
      clearTimeout(this.invalidateTimers.get(key)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      store.dispatch({ type: 'api/invalidateTags', payload: tags });
      this.invalidateTimers.delete(key);
    }, delay);

    this.invalidateTimers.set(key, timer);
  }

  private notifyListeners(type: string, data: any) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  subscribe(type: string, listener: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(listener);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  disconnect() {
    if (this.ws) {
      console.log(`🔌 Disconnecting WebSocket (Session: ${this.sessionId}, Connection: ${this.connectionId})`);
      this.ws.close(1000, 'Client disconnect'); // Clean close
      this.ws = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
    this.connectionId = null;
    // Keep sessionId to prevent creating new sessions on reconnect
    // this.sessionId = null; 
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
