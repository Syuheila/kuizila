from sqlalchemy import create_engine, inspect, text, event
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_schema_compatibility(engine_instance):
    inspector = inspect(engine_instance)
    with engine_instance.connect() as conn:
        # Check organizations table
        if not inspector.has_table("organizations"):
            conn.execute(text("""
                CREATE TABLE organizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    domain VARCHAR(100) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX ix_organizations_slug ON organizations (slug)"))

        # Check users table
        if inspector.has_table("users"):
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            if "organization_id" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN organization_id INTEGER DEFAULT NULL"))
            if "password_hash" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL"))
            if "department" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT 'General'"))
            if "job_title" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN job_title VARCHAR(100) DEFAULT NULL"))
            if "provider" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'email'"))
            if "provider_id" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN provider_id VARCHAR(255) DEFAULT NULL"))
            if "avatar" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar JSON DEFAULT NULL"))
            if "updated_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NULL"))

        # Check quiz_sessions
        if inspector.has_table("quiz_sessions"):
            session_cols = {c["name"] for c in inspector.get_columns("quiz_sessions")}
            if "game_mode" not in session_cols:
                conn.execute(text("ALTER TABLE quiz_sessions ADD COLUMN game_mode VARCHAR(50) DEFAULT 'classic'"))
            if "battle_settings" not in session_cols:
                conn.execute(text("ALTER TABLE quiz_sessions ADD COLUMN battle_settings JSON DEFAULT '{}'"))
        
        # Check participants
        if inspector.has_table("participants"):
            participant_cols = {c["name"] for c in inspector.get_columns("participants")}
            if "status" not in participant_cols:
                conn.execute(text("ALTER TABLE participants ADD COLUMN status VARCHAR(50) DEFAULT 'waiting'"))
            if "current_question_index" not in participant_cols:
                conn.execute(text("ALTER TABLE participants ADD COLUMN current_question_index INTEGER DEFAULT 0"))
            if "current_question_started_at" not in participant_cols:
                conn.execute(text("ALTER TABLE participants ADD COLUMN current_question_started_at TIMESTAMP DEFAULT NULL"))
        conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

