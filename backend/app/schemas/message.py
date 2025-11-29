"""
Message schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.message import MessageRole


class MessageCreate(BaseModel):
    consultation_id: int
    sender_role: MessageRole
    content: str
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    id: int
    consultation_id: int
    sender_role: MessageRole
    content: str
    metadata: Optional[Dict[str, Any]] = Field(alias="message_metadata")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


