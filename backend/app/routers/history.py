from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.routers.spotify import _get_current_user_id, _get_token_or_error
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/timeline")
async def get_mood_timeline(request: Request, db: Session = Depends(get_db), days: int = 30):
    access_token = _get_token_or_error(request)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    user_id = await _get_current_user_id(access_token, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify user")

    start_date = datetime.utcnow() - timedelta(days=days)
    
    entries = db.query(models.MoodEntry).filter(
        models.MoodEntry.user_id == user_id,
        models.MoodEntry.timestamp >= start_date
    ).order_by(models.MoodEntry.timestamp.desc()).all()
    
    # Aggregate data
    mood_counts = {}
    timeline = []
    
    for entry in entries:
        mood = entry.mood_name
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        timeline.append({
            "id": entry.id,
            "mood": mood,
            "timestamp": entry.timestamp.isoformat() + "Z",
            "playlist_id": entry.playlist_id,
            "tracks": json.loads(entry.tracks_preview_json) if entry.tracks_preview_json else []
        })
        
    return {
        "mood_distribution": mood_counts,
        "recent_entries": timeline
    }
