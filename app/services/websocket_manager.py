import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from app.auth import verify_token

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasting."""
    
    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store connections without authentication
        self.unauthenticated_connections: Set[WebSocket] = set()
        # Track connection metadata
        self.connection_metadata: Dict[WebSocket, dict] = {}
    
    async def add_connection(self, websocket: WebSocket, user_id: int = None, connection_id: str = None):
        """Add an already-accepted WebSocket connection."""
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            'user_id': user_id,
            'connection_id': connection_id,
            'connected_at': logger.info.__self__.name if hasattr(logger.info, '__self__') else 'unknown'
        }
        
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            
            # Limit connections per user to prevent spam
            # You can adjust this limit based on your needs (3-5 is reasonable)
            import os
            MAX_CONNECTIONS_PER_USER = int(os.getenv('MAX_WS_CONNECTIONS_PER_USER', '5'))
            if os.getenv('ENVIRONMENT') == 'development':
                MAX_CONNECTIONS_PER_USER = 10  # More lenient in dev
                
            if len(self.active_connections[user_id]) >= MAX_CONNECTIONS_PER_USER:
                logger.warning(f"User {user_id} has {len(self.active_connections[user_id])} connections, closing oldest (limit: {MAX_CONNECTIONS_PER_USER})")
                # Close the oldest connection
                oldest_ws = next(iter(self.active_connections[user_id]))
                try:
                    await oldest_ws.close(code=1008, reason="Connection limit exceeded")
                except:
                    pass
                self.active_connections[user_id].discard(oldest_ws)
                self.connection_metadata.pop(oldest_ws, None)
            
            self.active_connections[user_id].add(websocket)
            logger.info(f"User {user_id} connected via WebSocket (ID: {connection_id}, Total: {len(self.active_connections[user_id])})")
        else:
            self.unauthenticated_connections.add(websocket)
            logger.info(f"Unauthenticated WebSocket connection established (ID: {connection_id})")
    
    def disconnect(self, websocket: WebSocket, user_id: int = None):
        """Remove a WebSocket connection."""
        metadata = self.connection_metadata.pop(websocket, {})
        connection_id = metadata.get('connection_id', 'unknown')
        
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            remaining = len(self.active_connections[user_id])
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected from WebSocket (ID: {connection_id}, Remaining: {remaining})")
        else:
            self.unauthenticated_connections.discard(websocket)
            logger.info(f"Unauthenticated WebSocket connection closed (ID: {connection_id})")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            disconnected = set()
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Remove disconnected websockets
            for websocket in disconnected:
                self.active_connections[user_id].discard(websocket)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all connected users."""
        all_connections = []
        
        # Add authenticated connections
        for user_connections in self.active_connections.values():
            all_connections.extend(user_connections)
        
        # Add unauthenticated connections
        all_connections.extend(self.unauthenticated_connections)
        
        disconnected = set()
        for websocket in all_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected connections
        self._cleanup_disconnected(disconnected)
    
    async def broadcast_to_users(self, message: dict, user_ids: List[int]):
        """Broadcast a message to specific users."""
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    def _cleanup_disconnected(self, disconnected: Set[WebSocket]):
        """Remove disconnected WebSocket connections."""
        for websocket in disconnected:
            # Remove from authenticated connections
            for user_id, connections in list(self.active_connections.items()):
                connections.discard(websocket)
                if not connections:
                    del self.active_connections[user_id]
            
            # Remove from unauthenticated connections
            self.unauthenticated_connections.discard(websocket)
    
    def get_connected_users(self) -> List[int]:
        """Get list of connected user IDs."""
        return list(self.active_connections.keys())
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        authenticated_count = sum(len(connections) for connections in self.active_connections.values())
        return authenticated_count + len(self.unauthenticated_connections)


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
