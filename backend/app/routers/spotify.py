from fastapi import APIRouter, Response, Request
from fastapi.responses import RedirectResponse
import httpx
import base64
from urllib.parse import urlencode
from dotenv import load_dotenv
from app.config.mood_profiles import MOOD_PROFILES, MOOD_KEYWORDS

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


@router.get("/user/top-tracks")
async def get_user_top_tracks(
    request: Request,
    time_range: str = "medium_term",  # default
    limit: int = 20,
    offset: int = 0,
):
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"error": "Not authenticated"}

    url = "https://api.spotify.com/v1/me/top/tracks"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"time_range": time_range, "limit": limit, "offset": offset}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to retrieve top tracks", "details": str(e)}


# spotify audio analyzer deprecated - no longer works (call a raincheck on this function)

# @router.get("/tracks/audio-features")
# async def get_audio_features(request: Request, ids: str):
#     access_token = request.cookies.get("access_token")

#     if not access_token:
#         return {"error": "Not authenticated"}

#     url = "https://api.spotify.com/v1/audio-features"
#     headers = {"Authorization": f"Bearer {access_token}"}
#     params = {"ids": ids}

#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.get(url, headers=headers, params=params)
#             response.raise_for_status()
#             return response.json()
#     except httpx.HTTPStatusError as e:
#         # Print full error details
#         print(f"Status Code: {e.response.status_code}")
#         print(f"Response Body: {e.response.text}")
#         return {
#             "error": "Failed to retrieve audio features",
#             "status": e.response.status_code,
#             "details": str(e),  # Show full Spotify error
#             "url": url,
#         }


@router.get("/artists/{artist_id}")
async def get_artist(request: Request, artist_id: str):
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"error": "Not Authenticated"}

    url = f"https://api.spotify.com/v1/artists/{artist_id}"
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to retrieve artist", "details": str(e)}


@router.get("/recommendations")
async def get_recommendations(request: Request, mood: str, limit: int = 20):
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"error": "Not Authenticated"}

    if mood not in MOOD_PROFILES:
        return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    mood_profile = MOOD_PROFILES[mood]

    top_tracks_url = "https://api.spotify.com/v1/me/top/tracks"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"time_range": "short_term", "limit": 10}

    try:
        async with httpx.AsyncClient() as client:
            top_tracks_response = await client.get(
                top_tracks_url, headers=headers, params=params
            )
            top_tracks_response.raise_for_status()
            top_tracks_data = top_tracks_response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get top tracks.", "details": str(e)}

    artist_ids = set()
    for track in top_tracks_data.get("items", []):
        for artist in track.get("artists", []):
            artist_ids.add(artist["id"])

    user_genres = set()
    for artist_id in list(artist_ids)[:5]:  # limit to 5 artists
        artist_url = f"https://api.spotify.com/v1/artists/{artist_id}"
        try:
            async with httpx.AsyncClient() as client:
                artist_response = await client.get(artist_url, headers=headers)
                artist_response.raise_for_status()
                artist_data = artist_response.json()
                user_genres.update(artist_data.get("genres", []))
        except httpx.HTTPStatusError as e:
            print(f"Error fetching artist {artist_id}: {e}")
            continue

    search_genres = mood_profile["genres"][:2]  # top 2 mood genres

    # search query
    search_query = f"genre:{search_genres[0]}"
    search_url = "https://api.spotify.com/v1/search"
    search_params = {"q": search_query, "type": "track", "limit": limit}

    try:
        async with httpx.AsyncClient() as client:
            search_response = await client.get(
                search_url, headers=headers, params=search_params
            )
            search_response.raise_for_status()
            search_data = search_response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get search data", "details": str(e)}

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": search_data.get("tracks", {}).get("items", []),
    }


@router.get("/playlists/search")
async def search_playlists(request: Request, mood: str, limit: int = 10):
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"error": "Not Authenticated"}

    if mood not in MOOD_PROFILES:
        return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    mood_profile = MOOD_PROFILES[mood]

    search_query = f"{mood} {mood_profile['description'].split(','[0])}"

    search_url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {access_token}"}
    search_params = {
        "q": search_query,
        "type": "playlist",
        "limit": limit,
    }

    try:
        async with httpx.AsyncClient() as client:
            search_response = await client.get(
                search_url, headers=headers, params=search_params
            )
            search_response.raise_for_status()
            search_data = search_response.json()
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
    except:
        return {"error": "Invalid request. Send JSON with 'text' field"}

    if not text:
        return {"error": "No text provided"}

    mood_scores = {mood: 0 for mood in MOOD_KEYWORDS.keys()}

    for mood, keywords in MOOD_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                word_count = len(keyword.split())
                mood_scores[mood] += word_count

    detected_mood = max(mood_scores, key=mood_scores.get)
    max_score = mood_scores[detected_mood]

    if max_score == 0:
        return {
            "detected_mood": None,
            "confidence": 0,
            "message": "Could not determine mood from text",
            "scores": mood_scores,
        }

    total_matches = sum(mood_scores.values())
    confidence = max_score / total_matches

    return {
        "detected_mood": detected_mood,
        "confidence": confidence,
        "description": MOOD_PROFILES[detected_mood]["description"],
        "scores": mood_scores,
        "text_analyzed": text,
    }


@router.post("/mood-recommendations")
async def mood_recommendations(request: Request):
    access_token = request.cookies.get("access_token")

    if not access_token:
        return {"error": "Not Authenticated"}

    try:
        body = await request.json()
    except:
        return {"error": "Invalid JSON body"}

    if "text" in body:
        text = body.get("text", "").lower()

        mood_scores = {mood: 0 for mood in MOOD_KEYWORDS.keys()}

        for mood, keywords in MOOD_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    word_count = len(keyword.split())
                    mood_scores[mood] += word_count

        detected_mood = max(mood_scores, key=mood_scores.get)
        if mood_scores[detected_mood] == 0:
            return {"error": "Could not detect mood from text."}

        mood = detected_mood

    elif "mood" in body:
        mood = body.get("mood")
        if mood not in MOOD_PROFILES:
            return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    else:
        return {"error": "Provide either 'text' or 'mood' in request body"}

    limit = body.get("limit", 20)  # default 20

    mood_profile = MOOD_PROFILES[mood]

    top_tracks_url = "https://api.spotify.com/v1/me/top/tracks"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"time_range": "short_term", "limit": 10}

    try:
        async with httpx.AsyncClient() as client:
            top_tracks_response = await client.get(
                top_tracks_url, headers=headers, params=params
            )
            top_tracks_response.raise_for_status()
            top_tracks_data = top_tracks_response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get top tracks.", "details": str(e)}

    artist_ids = set()
    for track in top_tracks_data.get("items", []):
        for artist in track.get("artists", []):
            artist_ids.add(artist["id"])

    user_genres = set()
    for artist_id in list(artist_ids)[:5]:  # limit to 5 artists
        artist_url = f"https://api.spotify.com/v1/artists/{artist_id}"
        try:
            async with httpx.AsyncClient() as client:
                artist_response = await client.get(artist_url, headers=headers)
                artist_response.raise_for_status()
                artist_data = artist_response.json()
                user_genres.update(artist_data.get("genres", []))
        except httpx.HTTPStatusError as e:
            print(f"Error fetching artist {artist_id}: {e}")
            continue

    search_genres = mood_profile["genres"][:2]  # top 2 mood genres

    # search query
    search_query = f"genre:{search_genres[0]}"
    search_url = "https://api.spotify.com/v1/search"
    search_params = {"q": search_query, "type": "track", "limit": limit}

    try:
        async with httpx.AsyncClient() as client:
            search_response = await client.get(
                search_url, headers=headers, params=search_params
            )
            search_response.raise_for_status()
            search_data = search_response.json()
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to get search data", "details": str(e)}

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": search_data.get("tracks", {}).get("items", []),
    }
