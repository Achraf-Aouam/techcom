from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func, ForeignKey, Table,Boolean, Enum
from sqlalchemy.orm import relationship
from app.db import Base

from .enums import UserRoleType, EventStatusType



club_memberships = Table(
    "club_memberships",
    Base.metadata,
    Column("club_id" ,Integer,ForeignKey("clubs.id"), primary_key= True)  ,
    Column("user_id",Integer,ForeignKey("users.id"), primary_key= True) ,
    
    Column("joined_at" , TIMESTAMP, server_default=func.now())

)


event_attendance = Table(
    "event_attendance",
    Base.metadata,
    Column("event_id" ,Integer,ForeignKey("events.id"), primary_key= True)  ,
    Column("user_id",Integer,ForeignKey("users.id"), primary_key= True) ,
    Column("recorded_at" , TIMESTAMP, server_default=func.now())
)



class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer , primary_key= True , index = True)
    name = Column(String(255), nullable= False, index = True)
    description = Column(Text , nullable=True)
    image_url = Column(String(512), nullable=True)
    color_code = Column(String(7), nullable=True)
    is_active = Column(Boolean , default=True)

    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", foreign_keys=[manager_id])

    events = relationship("Event" , back_populates="club")

    members= relationship("User", secondary=club_memberships , back_populates="clubs" )

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())



class User(Base):
    __tablename__ = "users"
    id = Column(Integer , primary_key= True , index= True)
    student_id = Column(Integer, unique=True , nullable= False, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique= True , nullable= False)
    hashed_password = Column(String(255), nullable=False) # Modified
    role = Column(Enum(UserRoleType), default=UserRoleType.STUDENT)
    wants_email_notif =Column(Boolean , default= True)

    clubs = relationship("Club" , secondary=club_memberships , back_populates="members")

    events = relationship("Event", secondary=event_attendance, back_populates="attendees")


    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer , primary_key= True , index = True)
    name = Column(String(255), nullable= False, index = True)
    description = Column(Text , nullable=True)
    location = Column(Text , nullable=False)
    status = Column(Enum(EventStatusType))
    image_url = Column(String(512), nullable=True)
    start_time = Column(TIMESTAMP(timezone=False), nullable=True)
    end_time = Column(TIMESTAMP(timezone=False), nullable=True)


    club = relationship("Club", back_populates="events")
    club_id =Column(Integer, ForeignKey("clubs.id"), nullable=False)

    attendees = relationship("User", secondary=event_attendance, back_populates="events")

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())



