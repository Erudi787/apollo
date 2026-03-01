from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.routers.spotify import _get_current_user_id, _get_token_or_error, _get_group_recommendations
from app.config.mood_profiles import MOOD_PROFILES
import json
import string
import random

router = APIRouter(prefix="/api/blend", tags=["blend"])

@router.post("/create")
async def create_blend_session(request: Request, db: Session = Depends(get_db)):
    """Creates a new blend session returning a 5-character shortcode."""
    access_token = _get_token_or_error(request)
    host_id = await _get_current_user_id(access_token, db)
    
    # Generate 5-char uppercase alphanumeric shortcode
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    
    session = models.BlendSession(id=code, host_id=host_id)
    db.add(session)
    db.commit()
    
    # Try parsing refresh token if provided by frontend JSON
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token", "")
    except Exception:
        refresh_token = ""
        
    participant = models.BlendParticipant(
        session_id=code, 
        user_id=host_id, 
        access_token=access_token, 
        refresh_token=refresh_token
    )
    db.add(participant)
    db.commit()
    
    return {"session_id": code, "host_id": host_id}


@router.post("/{code}/join")
async def join_blend_session(code: str, request: Request, db: Session = Depends(get_db)):
    """Allows an authenticated user to join a session using its shortcode."""
    access_token = _get_token_or_error(request)
    code = code.upper()
    user_id = await _get_current_user_id(access_token, db)
    
    session = db.query(models.BlendSession).filter(
        models.BlendSession.id == code, 
        models.BlendSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or is closed.")
        
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token", "")
    except Exception:
        refresh_token = ""
        
    # Idempotent join: update token if they already joined
    existing = db.query(models.BlendParticipant).filter(
        models.BlendParticipant.session_id == code, 
        models.BlendParticipant.user_id == user_id
    ).first()
    
    if existing:
        existing.access_token = access_token
        existing.refresh_token = refresh_token
    else:
        participant = models.BlendParticipant(
            session_id=code, 
            user_id=user_id, 
            access_token=access_token, 
            refresh_token=refresh_token
        )
        db.add(participant)
        
    db.commit()
    return {"message": "Joined successfully", "session_id": code}


@router.get("/{code}")
async def get_blend_session(code: str, request: Request, db: Session = Depends(get_db)):
    """Fetch the state of a Blend Session and its participants (for Waiting Room polling)."""
    _get_token_or_error(request) # Ensure caller is authenticated
    code = code.upper()
    
    session = db.query(models.BlendSession).filter(models.BlendSession.id == code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    participants = db.query(models.BlendParticipant).filter(
        models.BlendParticipant.session_id == code
    ).all()
    
    users = []
    for p in participants:
        db_user = db.query(models.User).filter(models.User.id == p.user_id).first()
        if db_user:
            users.append({
                "id": db_user.id,
                "display_name": db_user.display_name,
                "image_url": db_user.image_url,
                "is_host": db_user.id == session.host_id
            })
            
    return {
        "id": session.id,
        "host_id": session.host_id,
        "is_active": session.is_active,
        "created_at": session.created_at.isoformat() + "Z",
        "participants": users
    }

@router.post("/{code}/generate")
async def generate_blend_playlist(code: str, request: Request, db: Session = Depends(get_db)):
    """Generate a group-consensus playlist. Only the host can trigger this."""
    access_token = _get_token_or_error(request)
    user_id = await _get_current_user_id(access_token, db)
    code = code.upper()
    
    session = db.query(models.BlendSession).filter(models.BlendSession.id == code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can generate the blend.")
        
    try:
        body = await request.json()
        mood = body.get("mood")
        limit = body.get("limit", 20)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    if mood not in MOOD_PROFILES:
        raise HTTPException(status_code=400, detail="Invalid mood selected")
        
    mood_profile = MOOD_PROFILES[mood]
        
    participants = db.query(models.BlendParticipant).filter(models.BlendParticipant.session_id == code).all()
    if not participants:
        raise HTTPException(status_code=400, detail="No participants found")
        
    # Pool tokens to feed into the Curated Intersect ML algorithm
    # Guarantee the Host's freshly validated token is forcibly mounted at index [0]
    # to authenticate the core Spotify Search requests without throwing 401 Unauthorized
    tokens = [access_token]
    for p in participants:
        if p.user_id != user_id:
            tokens.append(p.access_token)
    
    try:
        tracks = await _get_group_recommendations(tokens, mood_profile, limit, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate group blend: {str(e)}")
        
    # If successful, inject identical historical timeline snapshots into every user's personal Heatmap log
    if tracks:
        track_preview = json.dumps([{"id": t["id"], "name": t["name"], "artists": [a.get("name") for a in t.get("artists", [])], "album_image": t.get("album", {}).get("images", [{}])[0].get("url") if t.get("album", {}).get("images") else None} for t in tracks])
        
        for p in participants:
            entry = models.MoodEntry(
                user_id=p.user_id,
                mood_name=mood, # e.g. 'Chill', 'Upbeat'
                tracks_preview_json=track_preview
            )
            db.add(entry)
            
        # Allow room to remain active so participants can dynamically drop in/out
        # and re-generate ad-infinitum. 
        db.commit()

    return {
        "mood": mood,
        "description": mood_profile["description"],
        "tracks": tracks,
    }


@router.post("/{code}/leave")
async def leave_blend_session(code: str, request: Request, db: Session = Depends(get_db)):
    """Allows a participant to leave an active blend session."""
    access_token = _get_token_or_error(request)
    user_id = await _get_current_user_id(access_token, db)
    code = code.upper()
    
    session = db.query(models.BlendSession).filter(models.BlendSession.id == code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    existing = db.query(models.BlendParticipant).filter(
        models.BlendParticipant.session_id == code, 
        models.BlendParticipant.user_id == user_id
    ).first()
    
    if not existing:
        raise HTTPException(status_code=400, detail="You are not part of this session")
        
    db.delete(existing)
    
    # Auto-close the room if the Host bails out
    if session.host_id == user_id:
        session.is_active = False
        
    db.commit()
    return {"message": "Left session successfully"}
