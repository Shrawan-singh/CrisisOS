from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./crisis.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_columns():
    """Best-effort schema upgrades for SQLite without migrations."""
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE incidents ADD COLUMN confidence INTEGER",
            "ALTER TABLE incidents ADD COLUMN spam_count INTEGER DEFAULT 0",
        ]:
            try:
                conn.execute(stmt)
            except Exception:
                # Column likely exists already; ignore
                pass
