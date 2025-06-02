from pydantic import BaseModel , Field
from datetime import datetime, date
from typing import Optional , List


from .enums import ClubMemberRoleType,EventStatusType,UserRoleType

HEX_COLOR_REGEX = r"^#(?:[0-9a-fA-F]{3}){1,2}$"

class ClubBase(BaseModel):
    name :str =  Field(..., min_length=1, max_length=255)
    description : Optional[str] = None
    image_url : Optional[str] = None
    color_code : Optional[str] = Field("#103105", pattern = HEX_COLOR_REGEX )
    is_active : Optional[bool] = True

class ClubCreate(ClubBase):
    pass 

class ClubUpdate(BaseModel):
    name :Optional[str] =  Field(None, min_length=1, max_length=255)
    description : Optional[str] = None
    image_url : Optional[str] = None
    color_code : Optional[str] = Field("#103105", pattern = HEX_COLOR_REGEX )
    is_active : Optional[bool] = True

class ClubInDb(ClubBase):
    id:int
    created_at: datetime 
    updated_at: datetime

    class Config:
        orm_mode  = True