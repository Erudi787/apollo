from fastapi import APIRouter, Response, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
import os
import httpx
import base64
import secrets
import time
import hmac
import hashlib
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["authentication"])

# Constant values
spotify_client_id = os.getenv("SPOTIFY_CLIENT_ID")
spotify_client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")
spotify_auth_url = "https://accounts.spotify.com/authorize"
spotify_token_url = "https://accounts.spotify.com/api/token"

# Scopes
SCOPES = "user-read-private user-read-email user-top-read user-follow-read playlist-modify-public playlist-modify-private"


# ============================================================
# Helpers
# ============================================================

def _get_auth_header() -> str:
    """Return Base64-encoded client credentials for Spotify token requests."""
    credentials = f"{spotify_client_id}:{spotify_client_secret}"
    return base64.b64encode(credentials.encode()).decode()


def _create_signed_state() -> str:
    """Create an HMAC-signed state token (stateless — works on serverless).
    
    Format: {timestamp}.{nonce}.{signature}
    """
    timestamp = str(int(time.time()))
    nonce = secrets.token_urlsafe(8)
    payload = f"{timestamp}.{nonce}"
    signature = hmac.new(
        (spotify_client_secret or "fallback").encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()[:16]
    return f"{payload}.{signature}"


def _verify_signed_state(state: str) -> bool:
    """Verify an HMAC-signed state token."""
    try:
        parts = state.split(".")
        if len(parts) != 3:
            return False
        timestamp, nonce, signature = parts
        payload = f"{timestamp}.{nonce}"
        expected = hmac.new(
            (spotify_client_secret or "fallback").encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()[:16]
        if not hmac.compare_digest(signature, expected):
            return False
        # Verify expiry (10 minutes)
        if time.time() - int(timestamp) > 600:
            return False
        return True
    except Exception:
        return False


async def _fetch_spotify_profile(access_token: str) -> dict | None:
    """Fetch the current user's Spotify profile. Returns None on failure."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.spotify.com/v1/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "id": data["id"],
                "display_name": data.get("display_name"),
                "email": data.get("email", ""),
                "images": data.get("images", []),
            }
    except Exception:
        return None


# ============================================================
# Endpoints
# ============================================================

@router.get("/login")
def login():
    """Redirect the user to Spotify's authorization page."""
    state = _create_signed_state()

    params = {
        "client_id": spotify_client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": SCOPES,
        "state": state,
    }

    return RedirectResponse(f"{spotify_auth_url}?{urlencode(params)}")


@router.get("/callback")
async def callback(request: Request, code: str, state: str):
    """Handle the Spotify OAuth callback — exchange code for tokens."""
    # Verify CSRF state using HMAC signature (stateless — works on serverless)
    if not _verify_signed_state(state):
        return {"error": "State mismatch — possible CSRF attack"}

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    headers = {
        "Authorization": f"Basic {_get_auth_header()}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(spotify_token_url, headers=headers, data=data)

    if resp.status_code != 200:
        return {"error": "Failed to exchange authorization code", "details": resp.text}

    tokens = resp.json()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # URL fragment is inherently more secure than query parameters for tokens
    # because the fragment (#) is never sent to the server in HTTP requests.
    fragment = urlencode({
        "access_token": tokens.get("access_token"),
        "refresh_token": tokens.get("refresh_token")
    })
    
    response = RedirectResponse(url=f"{frontend_url}/callback#{fragment}")

    return response


@router.get("/status")
async def auth_status(request: Request, db: Session = Depends(get_db)):
    """Check if the user is authenticated and return their profile."""
    # Read token from Bearer header first (primary auth flow), fallback to cookie
    auth_header = request.headers.get("Authorization")
    access_token = None
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header.split(" ")[1]
    
    if not access_token:
        access_token = request.cookies.get("access_token")

    if not access_token:
        return {"authenticated": False}

    user = await _fetch_spotify_profile(access_token)

    if user:
        _upsert_user(db, user)
        return {"authenticated": True, "user": user}

    # Token might be expired — try refresh
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return {"authenticated": False}

    # Attempt silent refresh
    new_access_token = await _do_refresh(refresh_token)
    if not new_access_token:
        return {"authenticated": False}

    user = await _fetch_spotify_profile(new_access_token)
    if not user:
        return {"authenticated": False}

    _upsert_user(db, user)

    # We can't set cookies on this response easily without a Response object,
    # but the frontend interceptor will handle refresh via /auth/refresh
    return {"authenticated": True, "user": user}

def _upsert_user(db: Session, user_data: dict):
    db_user = db.query(models.User).filter(models.User.id == user_data["id"]).first()
    image_url = user_data["images"][0]["url"] if user_data.get("images") else None
    if not db_user:
        db_user = models.User(
            id=user_data["id"],
            display_name=user_data.get("display_name"),
            image_url=image_url
        )
        db.add(db_user)
    else:
        db_user.display_name = user_data.get("display_name")
        db_user.image_url = image_url
    db.commit()


@router.post("/logout")
async def logout():
    """Clear authentication cookies."""
    response = Response(content='{"message": "Logged out"}', media_type="application/json")
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


async def _do_refresh(refresh_token: str) -> str | None:
    """Exchange a refresh token for a new access token. Returns new token or None."""
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }

    headers = {
        "Authorization": f"Basic {_get_auth_header()}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(spotify_token_url, headers=headers, data=data)
            resp.raise_for_status()
            return resp.json().get("access_token")
    except Exception:
        return None


@router.post("/refresh")
async def refresh_token(request: Request):
    """Use the refresh token to get a new access token."""
    # Fallback checking: Body > Header > Cookie
    refresh = None
    try:
        body = await request.json()
        refresh = body.get("refresh_token")
    except Exception:
        pass
    
    if not refresh:
        refresh = request.cookies.get("refresh_token")

    if not refresh:
        return {"error": "No refresh token found"}, 401

    new_access_token = await _do_refresh(refresh)

    if not new_access_token:
        return {"error": "Failed to refresh token"}, 401

    return {"access_token": new_access_token}
