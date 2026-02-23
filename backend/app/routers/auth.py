from fastapi import APIRouter, Response, Request
from fastapi.responses import RedirectResponse
import os
import httpx
import base64
import secrets
import time
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

# In-memory store for pending OAuth states (avoids cross-domain cookie issues with ngrok)
# Maps state_token -> expiry_timestamp
_pending_states: dict[str, float] = {}

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
    # Prune expired states
    now = time.time()
    expired = [k for k, v in _pending_states.items() if v < now]
    for k in expired:
        del _pending_states[k]

    state = secrets.token_urlsafe(16)
    _pending_states[state] = now + 600  # valid for 10 minutes

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
    # Verify CSRF state from in-memory store
    expiry = _pending_states.pop(state, None)
    if expiry is None or time.time() > expiry:
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
    response = RedirectResponse(url=frontend_url)

    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        secure=True,
        samesite="none",
        max_age=3600,
    )

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="none",
        max_age=2592000,  # 30 days
    )

    return response


@router.get("/status")
async def auth_status(request: Request):
    """Check if the user is authenticated and return their profile."""
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"authenticated": False}

    user = await _fetch_spotify_profile(access_token)

    if user:
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

    # We can't set cookies on this response easily without a Response object,
    # but the frontend interceptor will handle refresh via /auth/refresh
    return {"authenticated": True, "user": user}


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
    refresh = request.cookies.get("refresh_token")

    if not refresh:
        return {"error": "No refresh token found"}, 401

    new_access_token = await _do_refresh(refresh)

    if not new_access_token:
        return {"error": "Failed to refresh token"}, 401

    response = Response(
        content='{"message": "Token refreshed"}',
        media_type="application/json",
    )
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=3600,
    )
    return response
