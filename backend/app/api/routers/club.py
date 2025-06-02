\
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.model.model import Club as ClubModel, User as UserModel, club_memberships
from app.schema.club import ClubCreate, ClubUpdate, ClubInDb
from app.schema.user import UserInDb
from app.schema.enums import ClubMemberRoleType, UserRoleType
from app.api.deps import get_current_active_user, RoleChecker

router = APIRouter()

@router.post("/", response_model=ClubInDb, status_code=status.HTTP_201_CREATED)
def create_club(
    club: ClubCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)  # Any authenticated user can create a club for now
):
    db_club = ClubModel(**club.model_dump())
    db.add(db_club)
    db.commit()
    db.refresh(db_club)
    return db_club

@router.get("/", response_model=List[ClubInDb])
def get_all_clubs(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(ClubModel)
    if active_only:
        query = query.filter(ClubModel.is_active == True)
    clubs = query.offset(skip).limit(limit).all()
    return clubs

@router.get("/{club_id}", response_model=ClubInDb)
def get_club_by_id(club_id: int, db: Session = Depends(get_db)):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club

@router.put("/{club_id}", response_model=ClubInDb)
def update_club_by_id(
    club_id: int,
    club_update: ClubUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Permission check: SAO_ADMIN or CLUB_MANAGER of this specific club
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    
    is_club_manager = False
    if not is_sao_admin: # type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER # or OWNER if you add it
        ).first()
        if membership:
            is_club_manager = True

    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this club")

    update_data = club_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(club, key, value)
    
    db.add(club)
    db.commit()
    db.refresh(club)
    return club

@router.delete("/{club_id}", status_code=status.HTTP_200_OK)
def delete_club_by_id(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Permission check: SAO_ADMIN or CLUB_MANAGER of this specific club
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    
    is_club_manager = False
    if not is_sao_admin:# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER 
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this club")

    db.delete(club)
    db.commit()
    return {"detail": "Club deleted successfully"}

# Club Memberships

@router.post("/{club_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
def add_member_to_club(
    club_id: int,
    user_id: int,
    role_in_club: Optional[ClubMemberRoleType] = ClubMemberRoleType.MEMBER,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    
    user_to_add = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user_to_add:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to add not found")

    # Permission: Club Admin/Owner (Manager) or SAO Admin
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager = False
    if not is_sao_admin:# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager):# type: ignore
         # Allow self-request to join if that's a feature, then admin approves.
         # For now, direct add by admin/manager.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add members to this club")

    existing_membership = db.query(club_memberships).filter(
        club_memberships.c.club_id == club_id,
        club_memberships.c.user_id == user_id
    ).first()

    if existing_membership:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member of this club")

    stmt = club_memberships.insert().values(
        club_id=club_id,
        user_id=user_id,
        role_in_club=role_in_club
    )
    db.execute(stmt)
    db.commit()
    return {"detail": f"User {user_id} added to club {club_id} as {role_in_club}"}


@router.get("/{club_id}/members", response_model=List[UserInDb]) # Consider a ClubMemberWithRole schema
def get_club_members(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Permission: Club Member or SAO Admin/Club Manager
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager_or_member = False
    if not is_sao_admin:# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id
        ).first()
        if membership: # Any member can see other members
            is_club_manager_or_member = True
            
    if not (is_sao_admin or is_club_manager_or_member):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view members of this club")
    
    # This returns UserInDb, for role, a custom join or schema is needed.
    # For now, returning users who are members.
    members = db.query(UserModel).join(club_memberships).filter(club_memberships.c.club_id == club_id).all()
    return members


@router.put("/{club_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def update_member_role_in_club(
    club_id: int,
    user_id: int,
    role_in_club: ClubMemberRoleType, # Make it required as per spec
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    # Permission: Club Admin/Owner (Manager) or SAO Admin
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager = False
    if not is_sao_admin:# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update member roles in this club")

    stmt = club_memberships.update().where(
        club_memberships.c.club_id == club_id,
        club_memberships.c.user_id == user_id
    ).values(role_in_club=role_in_club)
    
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found or no change in role")
    
    db.commit()
    return {"detail": f"User {user_id}'s role in club {club_id} updated to {role_in_club}"}


@router.delete("/{club_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_member_from_club(
    club_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    # Permission: Club Admin/Owner (Manager), SAO Admin, or User (to leave club)
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_self_removal = current_user.id == user_id
    is_club_manager = False

    if not (is_sao_admin or is_self_removal):# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager or is_self_removal):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove this member")

    stmt = club_memberships.delete().where(
        club_memberships.c.club_id == club_id,
        club_memberships.c.user_id == user_id
    )
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
        
    db.commit()
    return {"detail": f"User {user_id} removed from club {club_id}"}

# Get Clubs for a User (Moved to user.py or a new membership_router.py for better organization,
# but can be here if preferred, just ensure correct prefix in main.py)
# For now, I will add it to user.py as it's /users/{user_id}/clubs

# Get Events by Club ID (This will be in event.py, but linked from club)
# This is effectively a filter on GET /events/
