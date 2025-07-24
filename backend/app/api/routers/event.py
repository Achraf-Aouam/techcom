from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import text

from app.db import get_db
from app.model.model import (
    Event as EventModel,
    User as UserModel,
    Club as ClubModel,
    event_attendance,
)
from app.schema.event import EventCreate, EventUpdate, EventInDb
from app.schema.user import UserInDb
from app.schema.enums import EventStatusType, UserRoleType
from app.api.deps import get_current_user

router = APIRouter()


# get all events with optional club_id filter and role based evenstatus access, role 1.2.3
@router.get("/", response_model=List[EventInDb])
def get_all_events(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[List[EventStatusType]] = Query(None),
    club_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):

    query = db.query(EventModel)

    is_student = bool(current_user.role == UserRoleType.STUDENT)
    is_admin = bool(current_user.role == UserRoleType.SAO_ADMIN)
    is_manager = bool(current_user.role == UserRoleType.CLUB_MANAGER)
    is_filtered_club_manager = False
    if club_id:

        query = query.filter(EventModel.club_id == club_id)
        club = db.query(ClubModel).filter(ClubModel.id == club_id).first()
        if not club:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
            )
        is_filtered_club_manager = is_manager and current_user.id == club.manager_id

    used_status = [
        EventStatusType.POSTED,
        EventStatusType.PAST,
        EventStatusType.CURRENT,
    ]
    student_status = [
        EventStatusType.POSTED,
        EventStatusType.PAST,
        EventStatusType.CURRENT,
    ]
    admin_status = student_status + [EventStatusType.PLANNING, EventStatusType.PENDING]
    manager_status = admin_status + [EventStatusType.IDEATION]
    if status_filter:
        print("status filter", status_filter)
        if is_student:
            used_status = [x for x in student_status if x in status_filter]
        if is_admin:
            used_status = [x for x in admin_status if x in status_filter]
        if is_filtered_club_manager:  # type: ignore
            used_status = [x for x in manager_status if x in status_filter]
    else:
        if is_student:
            used_status = student_status
        if is_admin:
            used_status = admin_status
        if is_filtered_club_manager:  # type: ignore

            used_status = manager_status
    print("used status:", used_status)
    query = query.filter(EventModel.status.in_(used_status))
    events = query.offset(skip).limit(limit).all()
    return events


# get event by id, role 1.2.3


@router.get("/{event_id}", response_model=EventInDb)
def get_event_by_id(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    is_admin = bool(current_user.role == UserRoleType.SAO_ADMIN)
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER
    is_event_owner = False
    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_event_owner = bool(is_manager and current_user.id == club.manager_id)

    if bool(event.status == EventStatusType.IDEATION):
        if is_event_owner:
            return event
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Event access unothorized",
            )
    if event.status in [EventStatusType.PLANNING, EventStatusType.PENDING]:
        if is_event_owner or is_admin:
            return event
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Event access unothorized",
            )

    return event


# get event attendees , role 1.2


@router.get("/{event_id}/attendees", response_model=List[UserInDb])
def get_event_attendees(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),  # Permissions vary
):
    if current_user.role == UserRoleType.STUDENT:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student Not authorized to view event attendees",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    is_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER

    is_event_owner = False
    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_event_owner = is_manager and current_user.id == club.manager_id

    if not (bool(is_admin) or bool(is_event_owner)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not club owner not authorized to view event attendees",
        )

    attendees = (
        db.query(UserModel)
        .join(event_attendance)
        .filter(event_attendance.c.event_id == event_id)
        .all()
    )
    return attendees


# create event , role 2


@router.post("/", response_model=EventInDb, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    is_student = current_user.role == UserRoleType.STUDENT
    is_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER
    is_club_manager = False
    if bool(is_student) or bool(is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create events for this club",
        )

    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with id {event.club_id} not found",
        )

    is_club_manager = is_manager and current_user.id == club.manager_id

    if not (is_club_manager):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create events for this club",
        )

    db_event = EventModel(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


# register attendence, role 2


@router.post("/{event_id}/attendees/{user_id}", status_code=status.HTTP_201_CREATED)
def register_user_for_event(
    event_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    is_student = current_user.role == UserRoleType.STUDENT
    is_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER
    is_club_manager = False
    if bool(is_student) or bool(is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add attendance for this event",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    user_to_register = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user_to_register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User to register not found"
        )

    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_club_manager = is_manager and current_user.id == club.manager_id

    if not (is_club_manager):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to register for this event",
        )

    existing_attendance = (
        db.query(event_attendance)
        .filter(
            event_attendance.c.event_id == event_id,
            event_attendance.c.user_id == user_id,
        )
        .first()
    )

    if existing_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already registered for this event",
        )

    stmt = event_attendance.insert().values(event_id=event_id, user_id=user_id)
    db.execute(stmt)
    db.commit()
    return {"detail": f"User {user_id} registered for event {event_id}"}


# update event, role 2


@router.put("/{event_id}", response_model=EventInDb)
def update_event_by_id(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):

    is_student = current_user.role == UserRoleType.STUDENT
    is_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER
    is_club_manager = False
    if bool(is_student) or bool(is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this event",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_club_manager = is_manager and current_user.id == club.manager_id

    if not bool(is_club_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this event",
        )

    update_data = event_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# delete event, role 2


@router.delete("/{event_id}", status_code=status.HTTP_200_OK)
def delete_event_by_id(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):

    is_manager = current_user.role == UserRoleType.CLUB_MANAGER
    is_club_manager = False
    if not bool(is_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this event",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_club_manager = is_manager and current_user.id == club.manager_id

    if not (is_club_manager):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this event",
        )

    db.delete(event)
    db.commit()
    return {"detail": "Event deleted successfully"}


# update event status, role 2
@router.put("/{event_id}/status")
def update_event_status_by_id(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):

    is_student = current_user.role == UserRoleType.STUDENT
    is_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER
    is_club_manager = False
    if bool(is_student or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this event",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_club_manager = is_manager and current_user.id == club.manager_id

    if not (bool(is_club_manager)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this event",
        )

    if bool(event.status == EventStatusType.PENDING):
        if bool(is_club_manager):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this event state",
            )
    else:
        if bool(is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this event state ",
            )

    # Define the allowed status transitions in order
    status_flow = [
        EventStatusType.IDEATION,
        EventStatusType.PLANNING,
        EventStatusType.PENDING,
        EventStatusType.POSTED,
        EventStatusType.CURRENT,
        EventStatusType.PAST,
    ]

    try:
        current_index = status_flow.index(event.status)  # type: ignore
        next_index = current_index + 1

        if next_index >= len(status_flow):
            next_index = current_index - 1
        event.status = status_flow[next_index]  # type: ignore
        db.add(event)
        db.commit()
        db.refresh(event)
        return {"detail": f"Event status updated to {event.status}"}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event status",
        )


# acc or ref pending event, role 1
@router.put("/{event_id}/review")
def review_event(
    event_id: int,
    approve: bool,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    # Only SAO Admin can use this route
    if current_user.role != UserRoleType.SAO_ADMIN:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to review events",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    if event.status != EventStatusType.PENDING:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is not in pending state",
        )

    if approve:
        event.status = EventStatusType.POSTED  # type: ignore
    else:
        event.status = EventStatusType.PLANNING  # type: ignore

    db.add(event)
    db.commit()
    db.refresh(event)
    return {"detail": f"Event status updated to {event.status}"}


@router.get("/{event_id}/stats")
def get_event_stats(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if current_user.role == UserRoleType.STUDENT:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student Not authorized to view event attendees",
        )

    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    is_admin = current_user.role == UserRoleType.SAO_ADMIN
    is_manager = current_user.role == UserRoleType.CLUB_MANAGER

    is_event_owner = False
    club = db.query(ClubModel).filter(ClubModel.id == event.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    is_event_owner = is_manager and current_user.id == club.manager_id

    if not (bool(is_admin) or bool(is_event_owner)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not club owner not authorized to view event attendees",
        )

    # 1. Total attendance
    total_attendance = db.execute(
        text("SELECT COUNT(*) FROM event_attendance WHERE event_id = :event_id"),
        {"event_id": event_id},
    ).scalar()

    # 2. Attendance rate
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    attendance_rate = total_attendance / total_users if total_users else 0

    # 3. Member attendance rate
    total_members = db.execute(
        text("SELECT COUNT(*) FROM club_memberships WHERE club_id = :club_id"),
        {"club_id": club.id},
    ).scalar()
    member_attendance = db.execute(
        text(
            """
        SELECT COUNT(*) FROM event_attendance ea
        JOIN club_memberships cm ON ea.user_id = cm.user_id
        WHERE ea.event_id = :event_id AND cm.club_id = :club_id
        """
        ),
        {"event_id": event_id, "club_id": club.id},
    ).scalar()
    member_attendance_rate = member_attendance / total_members if total_members else 0

    # 4. Non-member attendees
    non_member_attendance = db.execute(
        text(
            """
        SELECT COUNT(*) FROM event_attendance ea
        WHERE ea.event_id = :event_id
        AND ea.user_id NOT IN (
            SELECT user_id FROM club_memberships WHERE club_id = :club_id
        )
        """
        ),
        {"event_id": event_id, "club_id": club.id},
    ).scalar()

    return {
        "total_attendance": total_attendance,
        "attendance_rate": attendance_rate,
        "member_attendance_rate": member_attendance_rate,
        "non_member_attendance": non_member_attendance,
    }
