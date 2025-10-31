from fastapi import APIRouter, Response, Request
from fastapi.responses import RedirectResponse
import os
import httpx
import base64
from urllib.parse import urlencode
import secrets
from dotenv import load_dotenv

load_dotenv()
print(f"Client: {os.getenv('SPOTIFY_CLIENT_ID')}")
print(f"Redirect URI: {os.getenv('REDIRECT_URI')}")

router = APIRouter(prefix="/auth", tags=["authentication"])
state = secrets.token_urlsafe(16)

# Constant values
spotify_client_id = os.getenv("SPOTIFY_CLIENT_ID")
spotify_client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")
spotify_auth_url = "https://accounts.spotify.com/authorize"
spotify_token_url = "https://accounts.spotify.com/api/token"

# Scopes
SCOPES = "user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private"


# Endpoints
@router.get("/login")
def login():
    params = {
        "client_id": spotify_client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": SCOPES,
        "state": state,
    }

    query_string = urlencode(params)
    auth_url = f"{spotify_auth_url}?{query_string}"

    # DEBUG: Print the full URL
    print("=" * 80)
    print("REDIRECT URL BEING SENT TO SPOTIFY:")
    print(f"redirect_uri param: {redirect_uri}")
    print(f"Full auth URL: {auth_url}")
    print("=" * 80)

    return RedirectResponse(auth_url)


@router.get("/callback")
async def callback(code: str, state: str):
    credentials = f"{spotify_client_id}:{spotify_client_secret}"
    credentials_b64 = base64.b64encode(credentials.encode()).decode()

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    headers = {
        "Authorization": f"Basic {credentials_b64}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            spotify_token_url,
            headers=headers,
            data=data,
        )

    tokens = response.json()

    response = RedirectResponse(url="/")

    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=3600,
    )

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=2592000,  # 1 month
    )

    return response
