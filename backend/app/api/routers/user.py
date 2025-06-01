from fastapi import APIRouter , status, Depends, HTTPException
from sqlalchemy.orm import Session

from typing import List

from app.db import get_db
from app.model.model import User as UserModel 
from app.schema.user import UserCreate , UserUpdate , UserInDb
from app.api.deps import get_current_active_user
from app.model.enums import UserRoleType # Changed from app.schema.enums

router = APIRouter()

#get curret user 
@router.get("/me", response_model= UserInDb )
def get_current_user_me(current_user: UserModel = Depends(get_current_active_user)): # Changed parameter name for clarity
    return current_user


#get all users only sao
@router.get("/", response_model= List[UserInDb] )
def get_all_users(db : Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)): # Added current_user dependency
    if current_user.role != UserRoleType.SAO_ADMIN: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    users = db.query(UserModel).all()
    return users


#get user by id only sao or admin
@router.get("/{userid}" , response_model= UserInDb)
def get_user_by_id(userid : int, db : Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    # Check if the current user is SAO_ADMIN or CLUB_MANAGER
    if current_user.role == UserRoleType.SAO_ADMIN or \
       current_user.role == UserRoleType.CLUB_MANAGER:# type: ignore
        user = db.query(UserModel).filter(UserModel.id == userid).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    # Check if the current user is requesting their own information
    if current_user.id == userid: #type:ignore
        return current_user
    
    # If none of the above, deny access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this resource"
    )


