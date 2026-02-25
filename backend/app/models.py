from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
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
    playlist_id = Column(String, nullable=True) # Spotify playlist ID
    tracks_preview_json = Column(Text, nullable=True) # JSON array of track data for previews without API call

    user = relationship("User", back_populates="mood_entries")

class Friendship(Base):
    __tablename__ = "friendships"

    follower_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    followed_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    followed = relationship("User", foreign_keys=[followed_id], back_populates="followers")
