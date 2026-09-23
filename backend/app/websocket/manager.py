from typing import Dict, List, Set, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("loomi_ws")

class ConnectionManager:
    def __init__(self):
        # room_code -> list of dict with websocket, role, participant_id, name
        self.rooms: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, websocket: WebSocket, room_code: str, role: str, participant_id: int = None, display_name: str = ""):
        await websocket.accept()
        room_code = room_code.upper()
        if room_code not in self.rooms:
            self.rooms[room_code] = []
        
        conn_info = {
            "ws": websocket,
            "role": role,
            "participant_id": participant_id,
            "display_name": display_name
        }
        self.rooms[room_code].append(conn_info)
        logger.info(f"WS Connect: {role} ({display_name}) connected to room {room_code}. Total: {len(self.rooms[room_code])}")

    def disconnect(self, websocket: WebSocket, room_code: str):
        room_code = room_code.upper()
        if room_code in self.rooms:
            self.rooms[room_code] = [c for c in self.rooms[room_code] if c["ws"] != websocket]
            if not self.rooms[room_code]:
                del self.rooms[room_code]
            logger.info(f"WS Disconnect: Connection removed from room {room_code}")

    async def broadcast_to_room(self, room_code: str, message: dict):
        room_code = room_code.upper()
        if room_code not in self.rooms:
            return

        dead_connections = []
        for conn in self.rooms[room_code]:
            try:
                await conn["ws"].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to connection: {e}")
                dead_connections.append(conn)

        for dead in dead_connections:
            if dead in self.rooms[room_code]:
                self.rooms[room_code].remove(dead)

    async def broadcast_to_hosts(self, room_code: str, message: dict):
        room_code = room_code.upper()
        if room_code not in self.rooms:
            return

        dead_connections = []
        for conn in self.rooms[room_code]:
            if conn["role"] == "host":
                try:
                    await conn["ws"].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to host: {e}")
                    dead_connections.append(conn)

        for dead in dead_connections:
            if dead in self.rooms[room_code]:
                self.rooms[room_code].remove(dead)

ws_manager = ConnectionManager()
