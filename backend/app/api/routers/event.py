\
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.model.model import Event as EventModel, User as UserModel, Club as ClubModel, event_attendance, club_memberships
from app.schema.event import EventCreate, EventUpdate, EventInDb
from app.schema.user import UserInDb
from app.schema.enums import EventStatusType, UserRoleType, ClubMemberRoleType
from app.api.deps import get_current_active_user, RoleChecker

router = APIRouter()

@router.post("/", response_model=EventInDb, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    # Check if club exists
    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Club with id {event.club_id} not found")

    # Permission: Club Admin/Owner (Manager) or SAO Admin
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager = False
    if not is_sao_admin: # type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == event.club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create events for this club")

    db_event = EventModel(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/", response_model=List[EventInDb])
def get_all_events(
    skip: int = 0,
    limit: int = 100,
    status: Optional[EventStatusType] = Query(None),
    club_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(EventModel)
    if status:
        query = query.filter(EventModel.status == status)
    if club_id:
        query = query.filter(EventModel.club_id == club_id)
    events = query.offset(skip).limit(limit).all()
    return events

@router.get("/{event_id}", response_model=EventInDb)
def get_event_by_id(event_id: int, db: Session = Depends(get_db)):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event

@router.put("/{event_id}", response_model=EventInDb)
def update_event_by_id(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Permission: Club Admin/Owner (Manager) of the event's club, or SAO Admin
    # Event creator permission is not directly modeled, relying on club role for now.
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager = False
    if not is_sao_admin: # type: ignore
        # event.club_id should be used here
        target_club_id = event.club_id 
        if event_update.club_id is not None and event_update.club_id != event.club_id:
            # If club_id is being changed, check permission on the NEW club_id as well
            # This logic can get complex if events can be moved between clubs by non-SAO admins.
            # For simplicity, let's assume only SAO_ADMIN can change club_id, or manager of BOTH clubs.
            # Current check: manager of the ORIGINAL club.
            pass # Add more complex logic if needed for club_id changes by non-SAO admins

        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == target_club_id, # Check against original event's club
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this event")

    update_data = event_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=status.HTTP_200_OK)
def delete_event_by_id(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Permission: Club Admin/Owner (Manager) of the event's club, or SAO Admin
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager = False
    if not is_sao_admin:# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == event.club_id,
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this event")

    db.delete(event)
    db.commit()
    return {"detail": "Event deleted successfully"}

# Event Attendance

@router.post("/{event_id}/attendees/{user_id}", status_code=status.HTTP_201_CREATED)
def register_user_for_event(
    event_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    user_to_register = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user_to_register:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to register not found")

    # Permission: Authenticated User (self-registration), or Club/Event Admin (Club Manager or SAO Admin)
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_self_registration = current_user.id == user_id
    is_club_manager = False

    if not (is_sao_admin or is_self_registration):# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == event.club_id, # Event's club
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True

    if not (is_sao_admin or is_club_manager or is_self_registration):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to register for this event")

    existing_attendance = db.query(event_attendance).filter(
        event_attendance.c.event_id == event_id,
        event_attendance.c.user_id == user_id
    ).first()

    if existing_attendance:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already registered for this event")

    stmt = event_attendance.insert().values(event_id=event_id, user_id=user_id)
    db.execute(stmt)
    db.commit()
    return {"detail": f"User {user_id} registered for event {event_id}"}


@router.get("/{event_id}/attendees", response_model=List[UserInDb])
def get_event_attendees(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user) # Permissions vary
):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Permission: Club/Event Admin (Club Manager or SAO Admin) or event attendees (depending on privacy settings)
    # For now, let's assume Club Manager or SAO Admin can see attendees.
    # Attendee visibility to other attendees can be a future enhancement.
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_club_manager = False
    if not is_sao_admin:# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == event.club_id, # Event's club
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True
            
    # Add check if current_user is an attendee if privacy allows attendees to see list
    # is_attendee = db.query(event_attendance).filter(event_attendance.c.event_id == event_id, event_attendance.c.user_id == current_user.id).first() is not None

    if not (is_sao_admin or is_club_manager):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view event attendees")

    attendees = db.query(UserModel).join(event_attendance).filter(event_attendance.c.event_id == event_id).all()
    return attendees


@router.delete("/{event_id}/attendees/{user_id}", status_code=status.HTTP_200_OK)
def unregister_user_from_event(
    event_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Permission: Authenticated User (self-unregistration), or Club/Event Admin (Club Manager or SAO Admin)
    is_sao_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_self_unregistration = current_user.id == user_id
    is_club_manager = False

    if not (is_sao_admin or is_self_unregistration):# type: ignore
        membership = db.query(club_memberships).filter(
            club_memberships.c.club_id == event.club_id, # Event's club
            club_memberships.c.user_id == current_user.id,
            club_memberships.c.role_in_club == ClubMemberRoleType.MANAGER
        ).first()
        if membership:
            is_club_manager = True

    if not (is_sao_admin or is_club_manager or is_self_unregistration):# type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to unregister for this event")

    stmt = event_attendance.delete().where(
        event_attendance.c.event_id == event_id,
        event_attendance.c.user_id == user_id
    )
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
        
    db.commit()
    return {"detail": f"User {user_id} unregistered from event {event_id}"}

# Note: GET /clubs/{club_id}/events is effectively GET /events/ with club_id filter.
# It can be added here or handled by the existing GET /events/ endpoint.
# For clarity, if a dedicated endpoint is desired as per routes.md:
@router.get("/club/{club_id}/events", response_model=List[EventInDb], name="get_events_by_club")
def get_events_by_club_id(
    club_id: int,
    skip: int = 0,
    limit: int = 100,
    eventstatus: Optional[EventStatusType] = Query(None),
    db: Session = Depends(get_db)
):
    # Check if club exists
    club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND , detail=f"Club with id {club_id} not found")
        
    query = db.query(EventModel).filter(EventModel.club_id == club_id)
    if eventstatus:
        query = query.filter(EventModel.eventstatus == eventstatus)
    events = query.offset(skip).limit(limit).all()
    return events

# Note: GET /users/{user_id}/events/attended will be in user.py
