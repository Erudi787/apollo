import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, spotify
import os
import uvicorn

sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()

app = FastAPI(
    title="Apollo 𓏢",
    description="AI-powered mood-based music playlist recommender using Spotify API",
    version="0.1",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3000",
        "https://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Apollo backend is up and running bishh",
        "version": "0.1",
        "docs": "/docs",
    }


# Routers
app.include_router(auth.router)
app.include_router(spotify.router)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("BACKEND_PORT", 8888)),
        reload=True,
        # ssl_keyfile="./certs/key.pem",
        # ssl_certfile="./certs/cert.pem",
    )
