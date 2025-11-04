from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.security import HTTPBearer
import json
import logging
from app.services.websocket_manager import websocket_manager
from app.auth import verify_token
from app.database import get_db
from app.models import User
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    user_id = None
    
    try:
        # Accept the connection first
        await websocket.accept()
        
        # Add to unauthenticated connections initially
        websocket_manager.unauthenticated_connections.add(websocket)
        logger.info("WebSocket connection established")
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get('type')
                
                if message_type == 'auth':
                    # Handle authentication
                    token = message.get('data', {}).get('token')
                    connection_id = message.get('data', {}).get('connectionId', 'unknown')
                    
                    if token:
                        try:
                            # Verify token and get user
                            payload = verify_token(token)
                            user_id = payload.get('sub')
                            
                            if user_id:
                                # Move from unauthenticated to authenticated
                                websocket_manager.unauthenticated_connections.discard(websocket)
                                
                                if int(user_id) not in websocket_manager.active_connections:
                                    websocket_manager.active_connections[int(user_id)] = set()
                                
                                # Add the connection with connection limiting
                                await websocket_manager.add_connection(websocket, int(user_id), connection_id)
                                
                                # Send authentication success message
                                await websocket.send_text(json.dumps({
                                    'type': 'auth_success',
                                    'data': {'user_id': user_id, 'connection_id': connection_id}
                                }))
                                
                                logger.info(f"User {user_id} authenticated via WebSocket (ID: {connection_id})")
                            else:
                                await websocket.send_text(json.dumps({
                                    'type': 'auth_error',
                                    'data': {'message': 'Invalid token'}
                                }))
                        except Exception as e:
                            logger.error(f"WebSocket authentication error: {e}")
                            await websocket.send_text(json.dumps({
                                'type': 'auth_error',
                                'data': {'message': 'Authentication failed'}
                            }))
                
                elif message_type == 'ping':
                    # Handle ping/pong for connection health
                    await websocket.send_text(json.dumps({
                        'type': 'pong',
                        'data': {'timestamp': message.get('data', {}).get('timestamp')}
                    }))
                
                else:
                    # Unknown message type
                    await websocket.send_text(json.dumps({
                        'type': 'error',
                        'data': {'message': f'Unknown message type: {message_type}'}
                    }))
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'data': {'message': 'Invalid JSON format'}
                }))
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'data': {'message': 'Internal server error'}
                }))
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
        websocket_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket, user_id)


@router.get("/ws/status")
async def websocket_status():
    """Get WebSocket connection status."""
    return {
        "connected_users": websocket_manager.get_connected_users(),
        "connection_count": websocket_manager.get_connection_count(),
        "status": "active"
    }
