from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.model.model import Club as ClubModel, User as UserModel, club_memberships
from app.schema.club import ClubCreate, ClubUpdate, ClubInDb
from app.schema.user import UserInDb
from app.schema.enums import UserRoleType
from app.api.deps import get_current_user
from app.model.model import event_attendance
from sqlalchemy import func

router = APIRouter()


# getting all clubs with optional pagination, role: 1-2-3


@router.get("/", response_model=List[ClubInDb])
def get_all_clubs(
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(ClubModel)

    if active_only:
        query = query.filter(ClubModel.is_active == True)
    if skip is not None and limit is not None and limit > skip:
        clubs = query.offset(skip).limit(limit).all()
    else:
        clubs = query.all()
    return clubs


# getting club by id , role: 1-2-3


@router.get("/{club_id}", response_model=ClubInDb)
def get_club_by_id(club_id: int, db: Session = Depends(get_db)):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    return club


# getting members of a club, role 1-2


@router.get(
    "/{club_id}/members", response_model=List[UserInDb]
)  # Consider a ClubMemberWithRole schema
def get_club_members(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )

    # Permission: Club Member or SAO Admin/Club Manager
    is_sao_admin = current_user.role.value == UserRoleType.SAO_ADMIN
    is_manager = (
        current_user.role.value == UserRoleType.CLUB_MANAGER
        and current_user.id.value == club.manager_id
    )  # can remove first check
    if not (is_sao_admin or is_manager):  # type check
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view members of this club",
        )

    members = (
        db.query(UserModel)
        .join(club_memberships)
        .filter(club_memberships.c.club_id == club_id)
        .all()
    )
    return members


# creating a club , role:1


@router.post("/", response_model=ClubInDb, status_code=status.HTTP_201_CREATED)
def create_club(
    club: ClubCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    print("Received payload:", club.model_dump())
    if current_user.role.value != UserRoleType.SAO_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create clubs",
        )

    db_club = ClubModel(**club.model_dump())
    db.add(db_club)
    db.commit()
    db.refresh(db_club)
    return db_club


# creating club membership, role: 3


@router.post("/{club_id}/members/", status_code=status.HTTP_201_CREATED)
def add_member_to_club(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )

    user_to_add = db.query(UserModel).filter(UserModel.id == current_user.id).first()
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User to add not found"
        )

    is_student = current_user.role == UserRoleType.STUDENT

    if not (is_student):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add members to this club",
        )

    existing_membership = (
        db.query(club_memberships)
        .filter(
            club_memberships.c.club_id == club_id,
            club_memberships.c.user_id == current_user.id,
        )
        .first()
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this club",
        )

    stmt = club_memberships.insert().values(
        club_id=club_id,
        user_id=current_user.id,
    )
    db.execute(stmt)
    db.commit()
    return {"detail": f"User {user_to_add.name} added to club {club.name}"}


# update club partially depending on role, role 1,2
@router.put("/{club_id}", response_model=ClubInDb)
def update_club_by_id(
    club_id: int,
    club_update: ClubUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if current_user.role.value == UserRoleType.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this club",
        )
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )

    # Permission check: SAO_ADMIN or CLUB_MANAGER of this specific club
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN

    is_club_manager = (
        current_user.role == UserRoleType.CLUB_MANAGER
        and current_user.id == club.manager_id
    )

    if not (is_sao_admin or is_club_manager):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this club",
        )

    update_data = club_update.model_dump(exclude_unset=True)

    if is_club_manager and is_sao_admin is False:  # type: ignore
        allowed_fields = ["description", "color_code", "image_url"]
        for key in list(update_data.keys()):
            if key not in allowed_fields:
                del update_data[key]

    if is_sao_admin and is_club_manager is False:  # type: ignore
        allowed_fields = ["name", "is_active", "manager_id"]
        for key in list(update_data.keys()):
            if key not in allowed_fields:
                del update_data[key]

    for key, value in update_data.items():
        setattr(club, key, value)

    db.add(club)
    db.commit()
    db.refresh(club)
    return club


@router.delete("/{club_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_member_from_club(
    club_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    # Permission: Club Admin/Owner (Manager), SAO Admin, or User (to leave club)
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_self_removal = current_user.id == user_id
    is_club_manager = (
        current_user.role == UserRoleType.CLUB_MANAGER
        and current_user.id == club.manager_id
    )

    if not (is_sao_admin or is_club_manager or is_self_removal):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove this member",
        )

    stmt = club_memberships.delete().where(
        club_memberships.c.club_id == club_id, club_memberships.c.user_id == user_id
    )
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found"
        )

    db.commit()
    return {"detail": f"User {user_id} removed from club {club_id}"}


# Get Clubs for a User (Moved to user.py or a new membership_router.py for better organization,
# but can be here if preferred, just ensure correct prefix in main.py)
# For now, I will add it to user.py as it's /users/{user_id}/clubs

# Get Events by Club ID (This will be in event.py, but linked from club)
# This is effectively a filter on GET /events/


@router.get("/{club_id}/stats", status_code=status.HTTP_200_OK)
def get_club_stats_by_id(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    # Fetch club
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if club is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )

    # Permission: Only SAO_ADMIN or the club manager
    is_sao_admin = bool(current_user.role == UserRoleType.SAO_ADMIN)
    is_club_manager = bool(
        current_user.role == UserRoleType.CLUB_MANAGER
        and current_user.id == club.manager_id
    )
    if not (is_sao_admin or is_club_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view club stats",
        )

    # Total number of events
    num_events = len(club.events)

    # Total number of members
    num_members = len(club.members)

    # Average attendance per event

    if num_events == 0:
        avg_attendance = 0
    else:
        event_ids = [event.id for event in club.events]
        if event_ids:
            attendance_counts = (
                db.query(
                    event_attendance.c.event_id, func.count(event_attendance.c.user_id)
                )
                .filter(event_attendance.c.event_id.in_(event_ids))
                .group_by(event_attendance.c.event_id)
                .all()
            )
            total_attendance = sum([count for _, count in attendance_counts])
            avg_attendance = total_attendance / num_events if num_events > 0 else 0
        else:
            avg_attendance = 0

    return {
        "total_events": num_events,
        "total_members": num_members,
        "avg_attendance_per_event": avg_attendance,
    }
