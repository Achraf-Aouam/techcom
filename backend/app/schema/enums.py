import enum


class UserRoleType(str , enum.Enum):
    SAO_ADMIN = "SAO_ADMIN"
    CLUB_MANAGER = "CLUB_MANAGER"
    STUDENT = "STUDENT"

class EventStatusType(str, enum.Enum):
    IDEATION = "IDEATION"
    PLANNING = "PLANNING"
    POSTED = "POSTED"
    CURRENT = "CURRENT"
    PAST = "PAST"

