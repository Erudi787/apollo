from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/api/lyrics", tags=["lyrics"])

@router.get("/")
async def get_lyrics(
    track_name: str = Query(..., description="Name of the track"),
    artist_name: str = Query(..., description="Name of the artist"),
    album_name: str = Query(None, description="Name of the album"),
    duration_ms: int = Query(None, description="Duration of the track in milliseconds")
):
    """
    Fetch lyrics from LRCLib API.
    Provides plain text and dynamically synced LRC text natively.
    """
    url = "https://lrclib.net/api/get"
    params = {
        "artist_name": artist_name,
        "track_name": track_name,
    }
    if album_name:
        params["album_name"] = album_name
    if duration_ms:
        params["duration"] = duration_ms // 1000  # LRCLib expects seconds

    headers = {
        "User-Agent": "AI.pollo Music Recommender (https://apollo-music.vercel.app/)"
    }

    try:
        async with httpx.AsyncClient() as client:
            # 1. Try exact metadata match
            resp = await client.get(url, params=params, headers=headers, timeout=8.0)
            
            # 2. If EXACT match fails (often happens with "Live" or "Remastered" tags), fallback to semantic SEARCH
            if resp.status_code == 404:
                search_url = "https://lrclib.net/api/search"
                # Strip out noisy tags like "(feat. XYZ)" for better fuzzy search yield
                clean_track = track_name.split("(")[0].strip()
                search_params = {"q": f"{clean_track} {artist_name}"}
                
                search_resp = await client.get(search_url, params=search_params, headers=headers, timeout=8.0)
                
                if search_resp.status_code == 200:
                    results = search_resp.json()
                    if results and len(results) > 0:
                        return results[0] # Return the most confident semantic match
                
                raise HTTPException(status_code=404, detail="Lyrics not found in external database")
                
            resp.raise_for_status()
            return resp.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Lyrics Provider Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Lyrics Proxy Error: {str(e)}")
