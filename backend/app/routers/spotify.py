from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.models import TrackFeedback
from pydantic import BaseModel
import json
import httpx
import asyncio
import random
from dotenv import load_dotenv
from app.config.mood_profiles import MOOD_PROFILES, MOOD_KEYWORDS, MOOD_ASSOCIATIONS

load_dotenv()

router = APIRouter(prefix="/api", tags=["spotify"])


# ============================================================
# Helpers
# ============================================================

def _auth_header(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _get_token_or_error(request: Request) -> str:
    # First try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    
    # Fallback to cookies
    token = request.cookies.get("access_token")
    if token:
        return token
    raise HTTPException(status_code=401, detail="Not authenticated")

async def _get_current_user_id(access_token: str, db: Session = None) -> str:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.spotify.com/v1/me", headers=_auth_header(access_token)
            )
            resp.raise_for_status()
            user_data = resp.json()
            user_id = user_data["id"]
            
            # Auto-register user into database to prevent foreign key Null errors on History/Social data
            if db:
                db_user = db.query(models.User).filter(models.User.id == user_id).first()
                if not db_user:
                    image_url = user_data["images"][0]["url"] if user_data.get("images") else None
                    new_user = models.User(
                        id=user_id,
                        display_name=user_data.get("display_name"),
                        image_url=image_url
                    )
                    db.add(new_user)
                    db.commit()
                    print(f"[AI.pollo] Auto-registered new user: {user_data.get('display_name')}")
            
            return user_id
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Spotify token expired")
        print(f"[AI.pollo] Error fetching user profile: {e}")
        raise HTTPException(status_code=401, detail="Could not identify user")
    except Exception as e:
        print(f"[AI.pollo] Error fetching user profile: {e}")
        raise HTTPException(status_code=401, detail="Could not identify user")


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


async def _fetch_followed_artists(access_token: str, limit: int = 20) -> list[dict]:
    """Fetch artists the user follows."""
    url = "https://api.spotify.com/v1/me/following"
    params = {"type": "artist", "limit": limit}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_auth_header(access_token), params=params)
            resp.raise_for_status()
            return resp.json().get("artists", {}).get("items", [])
    except Exception as e:
        print(f"[AI.pollo] Failed to fetch followed artists: {e}")
        return []


async def _fetch_related_artists(access_token: str, artist_id: str) -> list[dict]:
    """Fetch artists related to the given artist (Spotify's 'fans also like')."""
    url = f"https://api.spotify.com/v1/artists/{artist_id}/related-artists"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_auth_header(access_token))
            resp.raise_for_status()
            return resp.json().get("artists", [])
    except Exception as e:
        print(f"[AI.pollo] Failed to fetch related artists for {artist_id}: {e}")
        return []


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
    """Analyze text and return (detected_mood, confidence, scores).
    
    Uses a two-tier approach:
    1. Primary: Score against MOOD_KEYWORDS (comprehensive keyword lists)
    2. Fallback: Check MOOD_ASSOCIATIONS for slang/contextual/unconventional terms
    """
    text_lower = text.lower()
    mood_scores = {mood: 0 for mood in MOOD_KEYWORDS}

    # Tier 1: Primary keyword matching
    for mood, keywords in MOOD_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                word_count = len(keyword.split())
                mood_scores[mood] += word_count

    detected_mood = max(mood_scores, key=mood_scores.get)
    max_score = mood_scores[detected_mood]

    if max_score > 0:
        total_matches = sum(mood_scores.values())
        confidence = max_score / total_matches
        return detected_mood, confidence, mood_scores

    # Tier 2: Fallback — check MOOD_ASSOCIATIONS for slang/unconventional terms
    # Check longest phrases first to match multi-word expressions
    sorted_associations = sorted(MOOD_ASSOCIATIONS.keys(), key=len, reverse=True)
    association_scores: dict[str, int] = {}
    
    for phrase in sorted_associations:
        if phrase in text_lower:
            mapped_mood = MOOD_ASSOCIATIONS[phrase]
            association_scores[mapped_mood] = association_scores.get(mapped_mood, 0) + 1

    if association_scores:
        best_mood = max(association_scores, key=association_scores.get)
        total = sum(association_scores.values())
        confidence = association_scores[best_mood] / total
        # Populate mood_scores for the response
        mood_scores[best_mood] = association_scores[best_mood]
        print(f"[AI.pollo] Mood detected via associations: '{best_mood}' from text '{text}' (confidence: {confidence:.2f})")
        return best_mood, confidence, mood_scores

    # No match at all
    print(f"[AI.pollo] Could not detect mood from text: '{text}'")
    return None, 0, mood_scores


# Blocklist tokens for filtering out cover/karaoke/tribute junk from search results
_JUNK_TOKENS = [
    "cover", "karaoke", "tribute", "instrumental", "backing track",
    "in the style of", "originally performed", "made famous",
    "piano version", "music box", "lullaby version", "8-bit",
    "8 bit", "ringtone", "midi", "acapella version",
]

def _is_junk_track(track: dict) -> bool:
    """Return True if a track looks like a cover, karaoke, or tribute version."""
    name = (track.get("name") or "").lower()
    # Check track name for junk tokens
    for token in _JUNK_TOKENS:
        if token in name:
            return True
    # Check artist names for junk tokens
    for artist in track.get("artists", []):
        artist_name = (artist.get("name") or "").lower()
        for token in _JUNK_TOKENS:
            if token in artist_name:
                return True
    # Filter out very low-popularity tracks (often bootleg/cover accounts)
    if track.get("popularity", 50) < 5:
        return True
    return False


async def _get_personalized_recommendations(
    access_token: str, mood_profile: dict, limit: int = 20, db: Session = None
) -> list[dict]:
    """Get mood-matched, personalized tracks using a Curated Intersect Algorithm.
    
    Since Spotify deprecated /v1/recommendations and audio-features, we scrape 
    human-curated mood playlists and intersect them with the user's top artists
    and explicit machine-learning feedback preferences.
    """
    headers = _auth_header(access_token)
    
    import time
    t_start = time.time()

    # Step 0: Get User ID & fetch their explicit ML Feedback history
    user_id = await _get_current_user_id(access_token, db)
    liked_tracks = set()
    disliked_tracks = set()
    liked_artists = set()
    disliked_artists = set()

    if user_id and db:
        feedbacks = db.query(TrackFeedback).filter(TrackFeedback.user_id == user_id).all()
        for fb in feedbacks:
            if fb.is_liked:
                if fb.track_id: liked_tracks.add(fb.track_id)
                if fb.artist_id: liked_artists.add(fb.artist_id)
            else:
                if fb.track_id: disliked_tracks.add(fb.track_id)
                if fb.artist_id: disliked_artists.add(fb.artist_id)
        print(f"[AI.pollo ML] Loaded feedback profile: {len(liked_tracks)} liked tracks, {len(disliked_tracks)} disliked.")

    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        # Step 1: Fetch user's top artists to build the taste profile
        async def _get_followed():
            try:
                r = await client.get("https://api.spotify.com/v1/me/following", params={"type": "artist", "limit": 50})
                if r.status_code == 200:
                    return [a["id"] for a in r.json().get("artists", {}).get("items", []) if "id" in a]
            except Exception as e:
                print(f"[AI.pollo] Failed to fetch followed: {e}")
            return []

        async def _get_top(time_range: str):
            try:
                r = await client.get("https://api.spotify.com/v1/me/top/tracks", params={"time_range": time_range, "limit": 50})
                if r.status_code == 200:
                    artist_ids = []
                    for t in r.json().get("items", []):
                        for a in t.get("artists", []):
                            if "id" in a and a["id"] not in artist_ids:
                                artist_ids.append(a["id"])
                    return artist_ids
            except Exception:
                pass
            return []

        followed_ids, top_artist_ids = await asyncio.gather(
            _get_followed(),
            _get_top("short_term")
        )
        
        if not top_artist_ids:
            top_artist_ids = await _get_top("medium_term")
            
        user_taste_profile = set(followed_ids + top_artist_ids)
        print(f"[AI.pollo] Built user taste profile with {len(user_taste_profile)} unique artists.")

        # Step 2: Search for human-curated playlists matching the mood
        # Instead of just picking the first keyword [0], we combine the top 2 descriptors and genres 
        # to ensure we capture a wide net of vibes (e.g. 'sensual dark-pop' vs just 'sensual r-n-b')
        search_queries = []
        for keyword in mood_profile.get("search_descriptors", [""])[:2]:
            for genre in mood_profile.get("genres", [""])[:2]:
                search_queries.append(f"{keyword} {genre}".strip())
        
        playlist_ids = []
        try:
            # Run multiple targeted queries to build a much larger pool of 15 overlapping playlists
            banned_terms = mood_profile.get("banned_playlist_terms", [])
            async def _search_spotify_playlists(q: str):
                try:
                    r = await client.get(
                        "https://api.spotify.com/v1/search", 
                        params={"q": q, "type": "playlist", "limit": 5}
                    )
                    r.raise_for_status()
                    
                    scraped_ids = []
                    for p in r.json().get("playlists", {}).get("items", []):
                        if not p or not p.get("id"): continue
                        title = (p.get("name") or "").lower()
                        if any(term in title for term in banned_terms):
                            continue
                        scraped_ids.append(p["id"])
                    return scraped_ids
                except Exception:
                    return []

            results = await asyncio.gather(*[_search_spotify_playlists(q) for q in search_queries])
            for res in results:
                playlist_ids.extend(res)
                
            # Remove any duplicates
            playlist_ids = list(set(playlist_ids))
        except Exception as e:
            print(f"[AI.pollo] Playlist search failed: {e}")

        if not playlist_ids:
            return []
            
        print(f"[AI.pollo] Scraping {len(playlist_ids)} playlists from queries: {search_queries}...")

        # Step 3: Fetch tracks from all matching playlists in parallel
        async def _get_playlist_tracks(pid: str):
            try:
                r = await client.get(
                    f"https://api.spotify.com/v1/playlists/{pid}/tracks", 
                    params={"limit": 100}
                )
                if r.status_code == 200:
                    items = r.json().get("items", [])
                    # Filter out local tracks or podcasts
                    return [item["track"] for item in items if item.get("track") and item["track"].get("id")]
            except Exception:
                pass
            return []
            
        playlist_track_lists = await asyncio.gather(*[_get_playlist_tracks(pid) for pid in playlist_ids])

        # Step 4: Pool, score, and dedup tracks
        track_scores: dict[str, int] = {}
        track_dict: dict[str, dict] = {}
        dedup_map: set[tuple[str, str]] = set()

        for track_list in playlist_track_lists:
            for t in track_list:
                tid = t.get("id")
                if not tid or _is_junk_track(t):
                    continue
                    
                track_name = (t.get("name") or "").lower().strip()
                primary_artist = ""
                artists = t.get("artists", [])
                if artists:
                    primary_artist = (artists[0].get("name") or "").lower().strip()
                    
                dedup_key = (track_name, primary_artist)
                if dedup_key in dedup_map and tid not in track_dict:
                    continue # Skip duplicates
                    
                dedup_map.add(dedup_key)
                
                if tid not in track_dict:
                    track_dict[tid] = t
                    track_scores[tid] = 0
                    
                    # ML Dislike Penalty: Immediately skip tracks the user explicitly disliked
                    if tid in disliked_tracks or any(a.get("id") in disliked_artists for a in artists):
                        continue
                    
                    # Core intersect logic: +100 points for a taste match
                    if any(a.get("id") in user_taste_profile for a in artists):
                        track_scores[tid] += 100
                        
                    # Explicit boost (e.g. naturally float darker/toxic pop tracks higher if mood requests it)
                    explicit_boost = mood_profile.get("explicit_boost", 0)
                    if explicit_boost > 0 and t.get("explicit", False):
                        track_scores[tid] += explicit_boost
                        
                    # ML Bias Scoring
                    if tid in liked_tracks:
                        track_scores[tid] += 50
                    if any(a.get("id") in liked_artists for a in artists):
                        track_scores[tid] += 200
                
                # +1 point for every time it appears in a curated playlist (consensus sorting)
                track_scores[tid] += 1

        # Step 5: Sort by score DESC, then shuffle slightly amongst same-tier scores for variety
        score_tiers: dict[int, list[dict]] = {}
        for tid, score in track_scores.items():
            if score not in score_tiers:
                score_tiers[score] = []
            score_tiers[score].append(track_dict[tid])
            
        sorted_scores = sorted(score_tiers.keys(), reverse=True)
        final_tracks = []
        
        for score in sorted_scores:
            tier_tracks = score_tiers[score]
            random.shuffle(tier_tracks) # Shuffle within the same score group
            final_tracks.extend(tier_tracks)
            if len(final_tracks) >= limit * 2: # Keep enough for final shuffle
                break

    # Inject historical feedback markers into the final tracks for frontend UI persistence
    for t in final_tracks:
        tid = t.get("id", "")
        artists = t.get("artists", [])
        
        is_liked = tid in liked_tracks or any(a.get("id") in liked_artists for a in artists)
        is_disliked = tid in disliked_tracks or any(a.get("id") in disliked_artists for a in artists)
        
        if is_liked:
            t["_feedback"] = "liked"
        elif is_disliked:
            t["_feedback"] = "disliked"

    # Final slice
    result = final_tracks[:limit]
    
    # Calculate how many were taste-matched for logging
    matched = len([t for t in result if track_scores.get(t["id"], 0) >= 100])
    t_total = time.time() - t_start
    print(f"[AI.pollo] Returning {len(result)} tracks ({matched} matched user taste) in {t_total:.2f}s total via Curated Intersect Algorithm")
    return result


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
async def get_recommendations(request: Request, mood: str, limit: int = 20, db: Session = Depends(get_db)):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    if mood not in MOOD_PROFILES:
        return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    mood_profile = MOOD_PROFILES[mood]

    try:
        tracks = await _get_personalized_recommendations(access_token, mood_profile, limit, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")

    user_id = await _get_current_user_id(access_token, db)
    if user_id:
        track_preview = json.dumps([{"id": t["id"], "name": t["name"], "artists": [a.get("name") for a in t.get("artists", [])], "album_image": t.get("album", {}).get("images", [{}])[0].get("url") if t.get("album", {}).get("images") else None} for t in tracks])
        entry = models.MoodEntry(
            user_id=user_id,
            mood_name=mood,
            tracks_preview_json=track_preview
        )
        db.add(entry)
        db.commit()

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": tracks,
    }


@router.get("/playlists/search")
async def search_playlists(request: Request, mood: str, limit: int = 10):
    access_token = _get_token_or_error(request)
    if not access_token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    if mood not in MOOD_PROFILES:
        return JSONResponse({"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}, status_code=400)

    mood_profile = MOOD_PROFILES[mood]

    # Updated: Uses a combination of the top 2 genres and descriptors to yield richer Discover playlists
    search_queries = []
    for keyword in mood_profile.get("search_descriptors", [""])[:2]:
        for genre in mood_profile.get("genres", [""])[:2]:
            search_queries.append(f"{keyword} {genre}".strip())

    search_url = "https://api.spotify.com/v1/search"
    playlists = []
    
    try:
        async with httpx.AsyncClient() as client:
            banned_terms = mood_profile.get("banned_playlist_terms", [])
            async def _search_spotify_playlists(q: str):
                try:
                    resp = await client.get(
                        search_url, headers=_auth_header(access_token), params={"q": q, "type": "playlist", "limit": max(2, limit // len(search_queries))}
                    )
                    resp.raise_for_status()
                    
                    scraped_lists = []
                    for p in resp.json().get("playlists", {}).get("items", []):
                        if not p or not p.get("id"): continue
                        title = (p.get("name") or "").lower()
                        if any(term in title for term in banned_terms):
                            continue
                        scraped_lists.append(p)
                    return scraped_lists
                except Exception:
                    return []

            results = await asyncio.gather(*[_search_spotify_playlists(q) for q in search_queries])
            
            # Flatten and deduplicate
            seen_ids = set()
            for res_list in results:
                for p in res_list:
                    if p["id"] not in seen_ids:
                        seen_ids.add(p["id"])
                        playlists.append(p)
                        
            # Enforce overall API limit
            playlists = playlists[:limit]
            
    except httpx.HTTPStatusError as e:
        return {"error": "Failed to search playlists", "details": str(e)}

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "playlists": playlists,
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
async def mood_recommendations(request: Request, db: Session = Depends(get_db)):
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
        tracks = await _get_personalized_recommendations(access_token, mood_profile, limit, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")

    user_id = await _get_current_user_id(access_token, db)
    if user_id:
        track_preview = json.dumps([{"id": t["id"], "name": t["name"], "artists": [a.get("name") for a in t.get("artists", [])], "album_image": t.get("album", {}).get("images", [{}])[0].get("url") if t.get("album", {}).get("images") else None} for t in tracks])
        entry = models.MoodEntry(
            user_id=user_id,
            mood_name=mood,
            tracks_preview_json=track_preview
        )
        db.add(entry)
        db.commit()

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": tracks,
    }



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


# Dynamic path-param route must come AFTER static /playlists/search and /playlists/create
@router.get("/playlists/{playlist_id}/tracks")
async def get_playlist_tracks(request: Request, playlist_id: str, limit: int = 50):
    """Fetch tracks from a specific Spotify playlist."""
    access_token = _get_token_or_error(request)
    if not access_token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    params = {"limit": min(limit, 100), "fields": "items(track(id,name,uri,preview_url,duration_ms,artists(id,name,external_urls),album(id,name,images,release_date),external_urls)),total"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_auth_header(access_token), params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": "Failed to fetch playlist tracks", "details": str(e)}, status_code=500)

    tracks = [item["track"] for item in data.get("items", []) if item.get("track")]
    return {"tracks": tracks, "total": data.get("total", len(tracks))}

class TrackFeedbackRequest(BaseModel):
    track_id: str
    artist_id: str
    is_liked: bool

@router.post("/recommendations/feedback")
async def submit_track_feedback(
    request: Request, 
    feedback: TrackFeedbackRequest, 
    db: Session = Depends(get_db)
):
    """Save explicit user preferences (Thumbs Up/Down) to bias future algorithm recommendations."""
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    user_id = await _get_current_user_id(access_token, db)
    if not user_id:
        return {"error": "Could not determine user ID"}

    # Update or insert feedback
    existing_feedback = db.query(TrackFeedback).filter(
        TrackFeedback.user_id == user_id,
        TrackFeedback.track_id == feedback.track_id
    ).first()

    if existing_feedback:
        existing_feedback.is_liked = feedback.is_liked
    else:
        new_feedback = TrackFeedback(
            user_id=user_id,
            track_id=feedback.track_id,
            artist_id=feedback.artist_id,
            is_liked=feedback.is_liked
        )
        db.add(new_feedback)

    db.commit()
    return {"message": "Feedback saved successfully", "is_liked": feedback.is_liked}

