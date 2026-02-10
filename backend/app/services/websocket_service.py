from typing import List, Dict, Optional, Any
from fastapi import WebSocket
import json

class StockWebSocketManager:
    def __init__(self):
        # Store active connections: user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Could also store by role or just a flat list for simple broadcast
        self.all_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.all_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        if websocket in self.all_connections:
            self.all_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Broadcast to all connected clients
        # In a real app, you might want to filter by role or subscription
        for connection in self.all_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Handle disconnected clients that weren't properly cleaned up
                pass

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = StockWebSocketManager()
