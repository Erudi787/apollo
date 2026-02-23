from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx
from dotenv import load_dotenv
from app.config.mood_profiles import MOOD_PROFILES, MOOD_KEYWORDS

load_dotenv()

router = APIRouter(prefix="/api", tags=["spotify"])


# ============================================================
# Helpers
# ============================================================

def _auth_header(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _get_token_or_error(request: Request) -> str | None:
    return request.cookies.get("access_token")


async def _fetch_top_tracks(access_token: str, time_range: str = "short_term", limit: int = 10) -> list[dict]:
    """Fetch the user's top tracks from Spotify."""
    url = "https://api.spotify.com/v1/me/top/tracks"
    params = {"time_range": time_range, "limit": limit}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_auth_header(access_token), params=params)
        resp.raise_for_status()
        return resp.json().get("items", [])


async def _fetch_artist_genres(access_token: str, artist_ids: list[str], max_artists: int = 5) -> set[str]:
    """Fetch genres from a list of artist IDs."""
    genres = set()
    for artist_id in artist_ids[:max_artists]:
        url = f"https://api.spotify.com/v1/artists/{artist_id}"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=_auth_header(access_token))
                resp.raise_for_status()
                genres.update(resp.json().get("genres", []))
        except httpx.HTTPStatusError:
            continue
    return genres


async def _search_tracks_by_mood(access_token: str, mood_profile: dict, limit: int = 20) -> list[dict]:
    """Search Spotify for tracks matching a mood profile's genres."""
    search_genres = mood_profile["genres"][:2]
    search_query = f"genre:{search_genres[0]}"
    search_url = "https://api.spotify.com/v1/search"
    search_params = {"q": search_query, "type": "track", "limit": limit}

    async with httpx.AsyncClient() as client:
        resp = await client.get(search_url, headers=_auth_header(access_token), params=search_params)
        resp.raise_for_status()
        return resp.json().get("tracks", {}).get("items", [])


def _analyze_text_mood(text: str) -> tuple[str | None, float, dict[str, int]]:
    """Analyze text and return (detected_mood, confidence, scores)."""
    mood_scores = {mood: 0 for mood in MOOD_KEYWORDS}

    for mood, keywords in MOOD_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                word_count = len(keyword.split())
                mood_scores[mood] += word_count

    detected_mood = max(mood_scores, key=mood_scores.get)
    max_score = mood_scores[detected_mood]

    if max_score == 0:
        return None, 0, mood_scores

    total_matches = sum(mood_scores.values())
    confidence = max_score / total_matches
    return detected_mood, confidence, mood_scores


# ============================================================
# User Endpoints
# ============================================================

@router.get("/user/profile")
async def get_user_profile(request: Request):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.spotify.com/v1/me",
                headers=_auth_header(access_token),
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to fetch profile", "details": str(e)}


@router.get("/user/top-tracks")
async def get_user_top_tracks(
    request: Request,
    time_range: str = "medium_term",
    limit: int = 20,
    offset: int = 0,
):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    url = "https://api.spotify.com/v1/me/top/tracks"
    params = {"time_range": time_range, "limit": limit, "offset": offset}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_auth_header(access_token), params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to retrieve top tracks", "details": str(e)}


@router.get("/user/top-artists")
async def get_user_top_artists(
    request: Request,
    time_range: str = "medium_term",
    limit: int = 20,
    offset: int = 0,
):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    url = "https://api.spotify.com/v1/me/top/artists"
    params = {"time_range": time_range, "limit": limit, "offset": offset}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_auth_header(access_token), params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to retrieve top artists", "details": str(e)}


# ============================================================
# Artist Endpoints
# ============================================================

@router.get("/artists/{artist_id}")
async def get_artist(request: Request, artist_id: str):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    url = f"https://api.spotify.com/v1/artists/{artist_id}"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_auth_header(access_token))
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to retrieve artist", "details": str(e)}


# ============================================================
# Mood Endpoints
# ============================================================

@router.get("/moods")
async def get_moods():
    """Return all available mood profiles."""
    return MOOD_PROFILES


@router.get("/recommendations")
async def get_recommendations(request: Request, mood: str, limit: int = 20):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    if mood not in MOOD_PROFILES:
        return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    mood_profile = MOOD_PROFILES[mood]

    try:
        tracks = await _search_tracks_by_mood(access_token, mood_profile, limit)
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get recommendations", "details": str(e)}

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": tracks,
    }


@router.get("/playlists/search")
async def search_playlists(request: Request, mood: str, limit: int = 10):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    if mood not in MOOD_PROFILES:
        return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    mood_profile = MOOD_PROFILES[mood]

    # BUG FIX: was `split(','[0])` — index on string literal, not split result
    search_query = f"{mood} {mood_profile['description'].split(',')[0]}"

    search_url = "https://api.spotify.com/v1/search"
    params = {"q": search_query, "type": "playlist", "limit": limit}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                search_url, headers=_auth_header(access_token), params=params
            )
            resp.raise_for_status()
            search_data = resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to search playlists", "details": str(e)}

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "playlists": search_data.get("playlists", {}).get("items", []),
    }


@router.post("/analyze-mood")
async def analyze_mood(request: Request):
    try:
        body = await request.json()
        text = body.get("text", "").lower()
    except Exception:
        return {"error": "Invalid request. Send JSON with 'text' field"}

    if not text:
        return {"error": "No text provided"}

    detected_mood, confidence, scores = _analyze_text_mood(text)

    if detected_mood is None:
        return {
            "detected_mood": None,
            "confidence": 0,
            "message": "Could not determine mood from text",
            "scores": scores,
        }

    return {
        "detected_mood": detected_mood,
        "confidence": confidence,
        "description": MOOD_PROFILES[detected_mood]["description"],
        "scores": scores,
        "text_analyzed": text,
    }


@router.post("/mood-recommendations")
async def mood_recommendations(request: Request):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    try:
        body = await request.json()
    except Exception:
        return {"error": "Invalid JSON body"}

    limit = body.get("limit", 20)

    # Determine mood — either from text analysis or direct selection
    if "text" in body:
        text = body.get("text", "").lower()
        detected_mood, confidence, scores = _analyze_text_mood(text)
        if detected_mood is None:
            return {"error": "Could not detect mood from text."}
        mood = detected_mood
    elif "mood" in body:
        mood = body.get("mood")
        if mood not in MOOD_PROFILES:
            return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}
    else:
        return {"error": "Provide either 'text' or 'mood' in request body"}

    mood_profile = MOOD_PROFILES[mood]

    try:
        tracks = await _search_tracks_by_mood(access_token, mood_profile, limit)
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get recommendations", "details": str(e)}

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": tracks,
    }


# ============================================================
# Playlist Creation
# ============================================================

@router.post("/playlists/create")
async def create_playlist(request: Request):
    """Create a Spotify playlist and add tracks to it."""
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    try:
        body = await request.json()
    except Exception:
        return {"error": "Invalid JSON body"}

    name = body.get("name")
    track_uris = body.get("track_uris", [])
    description = body.get("description", "")
    is_public = body.get("public", True)

    if not name:
        return {"error": "Playlist name is required"}
    if not track_uris:
        return {"error": "At least one track URI is required"}

    headers = _auth_header(access_token)
    headers["Content-Type"] = "application/json"

    # Step 1: Get user ID
    try:
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://api.spotify.com/v1/me", headers=headers
            )
            user_resp.raise_for_status()
            user_id = user_resp.json()["id"]
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get user profile", "details": str(e)}

    # Step 2: Create playlist
    try:
        async with httpx.AsyncClient() as client:
            create_resp = await client.post(
                f"https://api.spotify.com/v1/users/{user_id}/playlists",
                headers=headers,
                json={
                    "name": name,
                    "description": description,
                    "public": is_public,
                },
            )
            create_resp.raise_for_status()
            playlist = create_resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to create playlist", "details": str(e)}

    # Step 3: Add tracks
    try:
        async with httpx.AsyncClient() as client:
            add_resp = await client.post(
                f"https://api.spotify.com/v1/playlists/{playlist['id']}/tracks",
                headers=headers,
                json={"uris": track_uris},
            )
            add_resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        return {"error": "Playlist created but failed to add tracks", "details": str(e)}

    return {
        "id": playlist["id"],
        "name": playlist["name"],
        "external_urls": playlist.get("external_urls", {}),
        "tracks_added": len(track_uris),
    }
