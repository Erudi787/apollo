import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    # Use SQLite for local development by default
    DATABASE_URL = "sqlite:///./apollo.db"

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Handle Vercel Serverless environment where PostgreSQL connection pools aggressively drop.
    # pool_pre_ping ensures SQLAlchemy tests the connection before executing the query and reconnects if stale.
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300 # Recycle connections every 5 minutes

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
