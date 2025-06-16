from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

from .enums import UserRoleType


class UserBase(BaseModel):
    student_id: int
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    role: UserRoleType
    wants_email_notif: Optional[bool] = True


class UserCreate(UserBase):
   password: str = Field(..., min_length=8)
    


class UserUpdate(BaseModel):
    student_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRoleType] = None
    wants_email_notif: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)



class UserInDb(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


