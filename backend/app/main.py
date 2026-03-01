import sys
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

# Must be BEFORE any `from app.*` imports so Vercel serverless can resolve the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, spotify, history, social, blend
from app.scheduler import retention_cleanup_loop
from app.database import engine, Base
from app import models
import os
import uvicorn

load_dotenv()

# Programmatically run Alembic migrations on startup instead of Base.metadata.create_all
# This ensures the `alembic_version` table is properly tracked in Vercel's PostgreSQL
from alembic.config import Config
from alembic import command

try:
    alembic_ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    alembic_cfg = Config(alembic_ini_path)
    command.upgrade(alembic_cfg, "head")
    print("[AI.pollo] Successfully ran Alembic migrations on cold boot.")
except Exception as e:
    print(f"[AI.pollo] Failed to run Alembic migrations: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Mounts infinite background daemon loops upon API startup and destroys them safely upon SIGTERM shutdown.
    """
    # Mount automated Database Data Retention sweeping policy logic (7-Day TTL)
    retention_loop = asyncio.create_task(retention_cleanup_loop())
    yield
    # Safely de-construct background daemons when exiting FastAPI
    retention_loop.cancel()
    
app = FastAPI(
    title="AI.pollo 𓏢",
    description="AI-powered mood-based music playlist recommender using Spotify API",
    version="0.1",
    lifespan=lifespan,
)

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:3000",
    "https://localhost:5173",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "AI.pollo backend is up and running bishh",
        "version": "0.1",
        "docs": "/docs",
    }


# Include routers
app.include_router(auth.router)
app.include_router(spotify.router)
app.include_router(social.router)
app.include_router(history.router)
app.include_router(blend.router)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("BACKEND_PORT", 8888)),
        reload=True,
        # ssl_keyfile="./certs/key.pem",
        # ssl_certfile="./certs/cert.pem",
    )
