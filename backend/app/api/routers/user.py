from fastapi import APIRouter , status, Depends, HTTPException
from sqlalchemy.orm import Session

from typing import List

from app.db import get_db
from app.model.model import User as UserModel, Club as ClubModel, Event as EventModel, club_memberships, event_attendance
from app.schema.user import UserCreate , UserUpdate , UserInDb
from app.schema.club import ClubInDb # Added
from app.schema.event import EventInDb # Added
from app.api.deps import get_current_active_user
from app.model.enums import UserRoleType # Changed from app.schema.enums

router = APIRouter()

#get curret user 
@router.get("/me", response_model= UserInDb )
def get_current_user_me(current_user: UserModel = Depends(get_current_active_user)): # Changed parameter name for clarity
    return current_user


#get all users only sao
@router.get("/", response_model= List[UserInDb] )
def get_all_users(db : Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user), skip: int = 0, limit: int = 100): # Added current_user dependency
    if current_user.role != UserRoleType.SAO_ADMIN: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    users = db.query(UserModel).offset(skip).limit(limit).all()
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


#create user
@router.post("/", response_model=UserInDb)
def create_user(user:UserCreate  ,db:Session = Depends(get_db)):
    db_user = UserModel(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

#update current user
@router.put("/me", response_model= UserInDb)
def update_current_user_me(user_data: UserUpdate ,db : Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    user_update_data = user_data.model_dump(exclude_unset=True)
    for key, value in user_update_data.items():
        setattr(current_user, key, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

#update user by id (Admin)
@router.put("/{user_id}", response_model=UserInDb)
def update_user_by_id(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    if current_user.role != UserRoleType.SAO_ADMIN: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_update_data = user_data.model_dump(exclude_unset=True)
    for key, value in user_update_data.items():
        setattr(db_user, key, value)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

#delete user by id (Admin)
@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user_by_id(user_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    if current_user.role != UserRoleType.SAO_ADMIN: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"detail": "User deleted successfully"}


# Get Clubs for a User
@router.get("/{user_id}/clubs", response_model=List[ClubInDb])
def get_clubs_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    if not (current_user.role == UserRoleType.SAO_ADMIN or current_user.id == user_id): # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    clubs = db.query(ClubModel).join(club_memberships).filter(club_memberships.c.user_id == user_id).all()
    return clubs


# Get Events Attended by User
@router.get("/{user_id}/events/attended", response_model=List[EventInDb])
def get_events_attended_by_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    if not (current_user.role == UserRoleType.SAO_ADMIN or current_user.id == user_id): # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    events = db.query(EventModel).join(event_attendance).filter(event_attendance.c.user_id == user_id).all()
    return events



