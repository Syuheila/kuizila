import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal, ensure_schema_compatibility
from .models import User
from .seed import seed_database, seed_organization_and_users
from .websocket.manager import ws_manager
from .routers import quizzes, questions, sessions, participants, reports, ai, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("loomi")

# Ensure schema compatibility and initialize database tables
ensure_schema_compatibility(engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Loomi API",
    description="Backend API for Loomi Interactive Quiz Platform",
    version="1.0.0"
)

# CORS configuration - reads from ALLOWED_ORIGINS env with dev fallbacks
allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
)
allowed_origins = [orig.strip() for orig in allowed_origins_raw.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(quizzes.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(participants.router)
app.include_router(reports.router)
app.include_router(ai.router)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        # Check if database needs initial seeding
        has_users = db.query(User).first()
        if not has_users:
            logger.info("Empty database detected. Seeding initial data...")
            seed_database(db)
            logger.info("Database seeding completed.")
        else:
            seed_organization_and_users(db)
            db.commit()
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Loomi Backend API",
        "docs_url": "/docs",
        "frontend_url": "http://localhost:5173",
        "message": "Loomi API is running. Access interactive API documentation at /docs or open the frontend application on http://localhost:5173."
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Loomi API",
        "version": "1.0.0"
    }

# Live session WebSocket endpoint
@app.websocket("/ws/session/{session_code}/{role}")
async def websocket_session_endpoint(
    websocket: WebSocket,
    session_code: str,
    role: str,
    participant_id: int = Query(None),
    display_name: str = Query("")
):
    session_code = session_code.strip().upper()
    await ws_manager.connect(
        websocket=websocket,
        room_code=session_code,
        role=role,
        participant_id=participant_id,
        display_name=display_name
    )
    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            # If client sends ping or action
            logger.debug(f"WS Msg from {role} ({session_code}): {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, session_code)
        logger.info(f"WS client disconnected from room {session_code}")
    except Exception as e:
        logger.error(f"WS error in {session_code}: {e}")
        ws_manager.disconnect(websocket, session_code)
