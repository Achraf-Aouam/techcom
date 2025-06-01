from typing import Generator, Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import SECRET_KEY, ALGORITHM
from app.db import get_db # Assuming get_db is in app.db
from app.model.model import User as UserModel # Assuming your User model is here
from app.schema.token import TokenData
from app.schema.user import UserInDb # Assuming UserInDb is your Pydantic model for user in DB
from app.schema.enums import UserRoleType

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token" # Matches the token endpoint in auth router
)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> UserModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, roles=payload.get("roles")) 
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserModel).filter(UserModel.email == token_data.username).first() # Or student_id based on what's in 'sub'
    if user is None:
        user = db.query(UserModel).filter(UserModel.student_id == token_data.username).first()
        if user is None:
            raise credentials_exception
    return user

def get_current_active_user(
    current_user: UserModel = Depends(get_current_user)
) -> UserModel:
    # if not current_user.is_active: # Assuming you have an is_active field in your User model
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Dependency for role-based access control
class RoleChecker:
    def __init__(self, allowed_roles: List[UserRoleType]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: UserModel = Depends(get_current_active_user)) -> UserModel:
        # The User model stores role as a single Enum value.
        # If a user could have multiple roles, the User model and this check would need adjustment.
        # For now, we assume a user has one primary role as defined in UserRoleType.
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role {current_user.role} is not authorized for this operation. Allowed roles: {self.allowed_roles}"
            )
        return current_user

# Specific role dependencies
def get_sao_admin_user(current_user: UserModel = Depends(RoleChecker([UserRoleType.SAO_ADMIN]))):
    return current_user

def get_club_manager_user(current_user: UserModel = Depends(RoleChecker([UserRoleType.CLUB_MANAGER, UserRoleType.SAO_ADMIN]))):
    # SAO_ADMIN can also manage clubs
    return current_user

def get_student_user(current_user: UserModel = Depends(RoleChecker([UserRoleType.STUDENT, UserRoleType.CLUB_MANAGER, UserRoleType.SAO_ADMIN]))):
    # All authenticated users are at least students in terms of base access
    return current_user
