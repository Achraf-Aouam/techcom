from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

from .enums import EventStatusType


class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: str = Field(..., min_length=1)
    status: EventStatusType
    image_url: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    club_id: int


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = Field(None, min_length=1)
    status: Optional[EventStatusType] = None
    image_url: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    club_id: Optional[int] = None


class EventInDb(EventBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True