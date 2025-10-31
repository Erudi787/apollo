from fastapi import APIRouter, Response, Request
from fastapi.responses import RedirectResponse
import os
import httpx
import base64
from urllib.parse import urlencode
import secrets
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["spotify"])


# Endpoints
@router.get("/user/profile")
async def get_user_profile(request: Request):
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"error": "Not authenticated"}

    url = "https://api.spotify.com/v1/me"
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to fetch profile", "details": str(e)}
