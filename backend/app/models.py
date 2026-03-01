from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Spotify ID
    display_name = Column(String, index=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    mood_entries = relationship("MoodEntry", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("TrackFeedback", back_populates="user", cascade="all, delete-orphan")
    
    # Relationships for followers/following
    followers = relationship(
        "Friendship",
        foreign_keys="[Friendship.followed_id]",
        back_populates="followed",
        cascade="all, delete-orphan"
    )
    following = relationship(
        "Friendship",
        foreign_keys="[Friendship.follower_id]",
        back_populates="follower",
        cascade="all, delete-orphan"
    )

class MoodEntry(Base):
    __tablename__ = "mood_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    mood_name = Column(String, index=True) # e.g., 'Happy', 'Chill'
    timestamp = Column(DateTime, default=datetime.utcnow)
    tracks_preview_json = Column(Text, nullable=True) # JSON array of track data for previews without API call

    user = relationship("User", back_populates="mood_entries")

class Friendship(Base):
    __tablename__ = "friendships"

    follower_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    followed_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    followed = relationship("User", foreign_keys=[followed_id], back_populates="followers")

class TrackFeedback(Base):
    """
    Stores explicit user preferences (Thumb Up / Thumb Down) for a track.
    This data continuously trains the Curated Intersect Algorithm for deeper personalization.
    """
    __tablename__ = "track_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    track_id = Column(String, index=True)
    artist_id = Column(String, index=True) # Stored redundantly to quickly bias artist scoring
    is_liked = Column(Boolean) # True = Thumb Up, False = Thumb Down
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="feedback")

class BlendSession(Base):
    """
    Represents an active multiplayer matchmaking room generated via an invite shortcode.
    """
    __tablename__ = "blend_sessions"

    id = Column(String, primary_key=True, index=True) # e.g. "XF92A"
    host_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    participants = relationship("BlendParticipant", back_populates="session", cascade="all, delete-orphan")
    host = relationship("User", foreign_keys=[host_id])

class BlendParticipant(Base):
    """
    Links a user to a specific BlendSession.
    Temporarily stores their ephemeral Spotify auth tokens so the Host's 
    `Generate` trigger has legal API permissions to query their Top Artists dataset.
    """
    __tablename__ = "blend_participants"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("blend_sessions.id", ondelete="CASCADE"), index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("BlendSession", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])
