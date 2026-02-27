from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.routers.spotify import _get_current_user_id, _get_token_or_error
import json

router = APIRouter(prefix="/api/social", tags=["social"])

@router.get("/feed")
async def get_social_feed(request: Request, db: Session = Depends(get_db)):
    access_token = _get_token_or_error(request)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    user_id = await _get_current_user_id(access_token, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify user")

    # Get followed users
    following = db.query(models.Friendship).filter(models.Friendship.follower_id == user_id).all()
    following_ids = [f.followed_id for f in following]
    
    # Optimized: Single merged query eliminating the N+1 vulnerability
    feed_entries = db.query(models.MoodEntry, models.User).outerjoin(
        models.User, models.MoodEntry.user_id == models.User.id
    ).filter(
        models.MoodEntry.user_id.in_(following_ids)
    ).order_by(models.MoodEntry.timestamp.desc()).limit(50).all()
    
    feed = []
    for entry, user in feed_entries:
        feed.append({
            "id": entry.id,
            "user": {
                "id": user.id,
                "display_name": user.display_name,
                "image_url": user.image_url
            } if user else None,
            "mood": entry.mood_name,
            "timestamp": entry.timestamp.isoformat() + "Z",
            "tracks": json.loads(entry.tracks_preview_json) if entry.tracks_preview_json else []
        })
        
    return {"feed": feed}

@router.post("/follow/{target_id}")
async def follow_user(request: Request, target_id: str, db: Session = Depends(get_db)):
    access_token = _get_token_or_error(request)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    user_id = await _get_current_user_id(access_token, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify user")

    if user_id == target_id:
        return {"error": "Cannot follow yourself"}
        
    target_user = db.query(models.User).filter(models.User.id == target_id).first()
    if not target_user:
        return {"error": "Target user not found"}
        
    existing = db.query(models.Friendship).filter(
        models.Friendship.follower_id == user_id,
        models.Friendship.followed_id == target_id
    ).first()
    
    if existing:
        return {"message": "Already following"}
        
    friendship = models.Friendship(follower_id=user_id, followed_id=target_id)
    db.add(friendship)
    db.commit()
    
    return {"message": f"Successfully followed {target_user.display_name}"}

@router.get("/search-users")
async def search_users(q: str, db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.display_name.ilike(f"%{q}%")).limit(10).all()
    return {"users": [{"id": u.id, "display_name": u.display_name, "image_url": u.image_url} for u in users]}
