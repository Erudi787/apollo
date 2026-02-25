import sys
from pathlib import Path

# Must be BEFORE any `from app.*` imports so Vercel serverless can resolve the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, spotify, history, social
import os
import uvicorn

load_dotenv()

app = FastAPI(
    title="AI.pollo 𓏢",
    description="AI-powered mood-based music playlist recommender using Spotify API",
    version="0.1",
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


# Routers
app.include_router(auth.router)
app.include_router(spotify.router)
app.include_router(history.router)
app.include_router(social.router)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("BACKEND_PORT", 8888)),
        reload=True,
        # ssl_keyfile="./certs/key.pem",
        # ssl_certfile="./certs/cert.pem",
    )
