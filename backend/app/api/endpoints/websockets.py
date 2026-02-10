from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.websocket_service import manager
# from app.api.deps import get_current_user_ws

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    # In a real scenario, you'd validate the user token here.
    # For now, we trust the user_id (or validate it via a query param token if needed)
    # Ideally, we should use a dependency to authenticate the WS connection
    
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep the connection alive and listen for client messages if necessary
            # For now, clients mainly listen, but they might send "subscribe" messages later
            data = await websocket.receive_text()
            # Handle client messages (ping, subscribe, etc.)
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
