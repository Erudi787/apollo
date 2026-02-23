from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
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
    access_token: str, mood_profile: dict, limit: int = 20
) -> list[dict]:
    """Get mood-matched, personalized tracks using Spotify Search API.
    
    Optimized: uses a single httpx client and parallelizes all API calls.
    """
    headers = _auth_header(access_token)
    search_url = "https://api.spotify.com/v1/search"

    import time
    t_start = time.time()

    # === Phase 1: Fetch followed + top tracks IN PARALLEL ===
    async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:

        async def _get_followed():
            try:
                r = await client.get("https://api.spotify.com/v1/me/following",
                                     params={"type": "artist", "limit": 30})
                r.raise_for_status()
                return r.json().get("artists", {}).get("items", [])
            except Exception as e:
                print(f"[AI.pollo] Failed to fetch followed: {e}")
                return []

        async def _get_top(time_range: str):
            try:
                r = await client.get("https://api.spotify.com/v1/me/top/tracks",
                                     params={"time_range": time_range, "limit": 20})
                r.raise_for_status()
                return r.json().get("items", [])
            except Exception:
                return []

        async def _get_related(artist_id: str):
            try:
                r = await client.get(f"https://api.spotify.com/v1/artists/{artist_id}/related-artists")
                r.raise_for_status()
                return r.json().get("artists", [])
            except Exception:
                return []

        # Parallel: followed + short-term top tracks
        followed_raw, top_tracks = await asyncio.gather(
            _get_followed(),
            _get_top("short_term")
        )

        # Fallback to medium_term if no short-term history
        if not top_tracks:
            top_tracks = await _get_top("medium_term")

        t_phase1 = time.time()
        print(f"[AI.pollo] Phase 1 (followed+top) took {t_phase1 - t_start:.2f}s")

        # === Extract artists into tiers ===
        followed_artists: list[dict] = []
        top_artists: list[dict] = []
        all_artist_names: set[str] = set()

        for a in followed_raw:
            name, aid = a.get("name"), a.get("id")
            if name and name not in all_artist_names:
                followed_artists.append({"name": name, "id": aid})
                all_artist_names.add(name)

        if top_tracks:
            for track in top_tracks:
                for artist in track.get("artists", []):
                    name, aid = artist.get("name"), artist.get("id")
                    if name and name not in all_artist_names:
                        top_artists.append({"name": name, "id": aid})
                        all_artist_names.add(name)
                        if len(top_artists) >= 10:
                            break
                if len(top_artists) >= 10:
                    break

        # === Phase 2: Discover related artists IN PARALLEL ===
        seeds = (followed_artists[:3] + top_artists[:2])
        random.shuffle(seeds)
        seed_ids = [s["id"] for s in seeds[:3] if s.get("id")]

        discovered_artists: list[dict] = []
        if seed_ids:
            related_results = await asyncio.gather(*[_get_related(sid) for sid in seed_ids])
            for related_list in related_results:
                for a in related_list[:5]:
                    name, aid = a.get("name"), a.get("id")
                    if name and name not in all_artist_names:
                        discovered_artists.append({"name": name, "id": aid})
                        all_artist_names.add(name)

        t_phase2 = time.time()
        print(f"[AI.pollo] Phase 2 (related artists) took {t_phase2 - t_phase1:.2f}s")
        print(f"[AI.pollo] Followed: {[a['name'] for a in followed_artists[:5]]}")
        print(f"[AI.pollo] Top: {[a['name'] for a in top_artists[:5]]}")
        print(f"[AI.pollo] Discovered: {[a['name'] for a in discovered_artists[:5]]}")

        # === Build prioritized artist pool ===
        random.shuffle(followed_artists)
        random.shuffle(discovered_artists)
        random.shuffle(top_artists)

        artist_pool: list[str] = []
        for a in followed_artists[:6]:
            artist_pool.append(a["name"])
        for a in discovered_artists[:4]:
            artist_pool.append(a["name"])
        for a in top_artists[:3]:
            if a["name"] not in set(artist_pool):
                artist_pool.append(a["name"])

        # Mood params
        mood_genres = mood_profile.get("genres", [])
        mood_descriptors = mood_profile.get("search_descriptors", [])
        mood_keyword = mood_descriptors[0] if mood_descriptors else (
            mood_genres[0] if mood_genres else "music"
        )

        print(f"[AI.pollo] Artist pool ({len(artist_pool)}): {artist_pool}")

        # === Phase 3: Search all artists IN PARALLEL ===
        all_tracks: list[dict] = []
        seen_ids: set[str] = set()
        dedup_map: dict[tuple[str, str], int] = {}

        def _add_track(t: dict) -> None:
            tid = t.get("id")
            if not tid or tid in seen_ids or _is_junk_track(t):
                return
            track_name = (t.get("name") or "").lower().strip()
            primary_artist = ""
            artists = t.get("artists", [])
            if artists:
                primary_artist = (artists[0].get("name") or "").lower().strip()
            dedup_key = (track_name, primary_artist)
            if dedup_key in dedup_map:
                existing_idx = dedup_map[dedup_key]
                if t.get("popularity", 0) > all_tracks[existing_idx].get("popularity", 0):
                    old_id = all_tracks[existing_idx].get("id")
                    if old_id:
                        seen_ids.discard(old_id)
                    all_tracks[existing_idx] = t
                    seen_ids.add(tid)
                return
            dedup_map[dedup_key] = len(all_tracks)
            all_tracks.append(t)
            seen_ids.add(tid)

        async def _search(query: str, search_limit: int = 10) -> list[dict]:
            """Run search and return raw items (no side effects)."""
            try:
                r = await client.get(search_url, params={"q": query, "type": "track", "limit": search_limit})
                if r.status_code == 200:
                    return r.json().get("tracks", {}).get("items", [])
            except Exception:
                pass
            return []

        # Build all search queries upfront
        search_tasks = []
        for artist_name in artist_pool:
            search_tasks.append(_search(f"artist:{artist_name}", search_limit=5))
            if mood_descriptors:
                descriptor = random.choice(mood_descriptors)
                search_tasks.append(_search(f"artist:{artist_name} {descriptor}", search_limit=5))

        # Fire ALL searches in parallel
        search_results = await asyncio.gather(*search_tasks)

        # Collect results sequentially (dedup is order-sensitive)
        for items in search_results:
            for t in items:
                _add_track(t)

        t_phase3 = time.time()
        print(f"[AI.pollo] Phase 3 (parallel search, {len(search_tasks)} queries) took {t_phase3 - t_phase2:.2f}s")

        # Step 4: Fill remaining with general mood searches (also parallel)
        if len(all_tracks) < limit:
            fill_tasks = []
            for descriptor in (mood_descriptors or [mood_keyword])[:3]:
                for genre in mood_genres[:2]:
                    fill_tasks.append(_search(f"{descriptor} genre:{genre}", search_limit=10))
            if fill_tasks:
                fill_results = await asyncio.gather(*fill_tasks)
                for items in fill_results:
                    for t in items:
                        _add_track(t)

    # Final cleanup
    all_tracks = [t for t in all_tracks if t is not None]
    random.shuffle(all_tracks)
    result = all_tracks[:limit]
    pool_set = set(artist_pool)
    matched = len([t for t in result if any(a.get('name', '') in pool_set for a in t.get('artists', []))])
    t_total = time.time() - t_start
    print(f"[AI.pollo] Returning {len(result)} tracks ({matched} from artist pool) in {t_total:.2f}s total")
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
async def get_recommendations(request: Request, mood: str, limit: int = 20):
    access_token = _get_token_or_error(request)
    if not access_token:
        return {"error": "Not authenticated"}

    if mood not in MOOD_PROFILES:
        return {"error": f"Invalid mood. Choose from: {list(MOOD_PROFILES.keys())}"}

    mood_profile = MOOD_PROFILES[mood]

    try:
        tracks = await _get_personalized_recommendations(access_token, mood_profile, limit)
    except Exception as e:
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
        tracks = await _get_personalized_recommendations(access_token, mood_profile, limit)
    except Exception as e:
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
