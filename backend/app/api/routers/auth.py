from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.db import get_db
from app.model.model import User as UserModel # Assuming your User model
from app.schema.token import Token
from app.schema.user import UserInDb # For response model if needed

router = APIRouter()

@router.post("/token", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Authenticates a user and returns an access token.
    Username can be either student_id or email.
    """
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user:
        # Try finding by student_id if email not found
        try:
            student_id = int(form_data.username)
            user = db.query(UserModel).filter(UserModel.student_id == student_id).first()
        except ValueError:
            # If username is not a valid integer for student_id, it won't match
            pass

    # if not user or not security.verify_password(form_data.password, user.password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect username or password",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    if not user or not security.verify_password(form_data.password, user.password.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # The subject of the token can be the user's email or student_id.
    # Storing the role(s) in the token can be useful for quick client-side checks
    # or for stateless authorization on the server, though server-side checks against the DB are more secure.
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Assuming user.role is an Enum like UserRoleType
    # If a user can have multiple roles, this needs to be handled differently (e.g., a list of roles)
    # For simplicity, using the single role from the model.
    roles_str = str(user.role.value) # Convert enum to string

    access_token = security.create_access_token(
        data={"sub": user.email, "roles": roles_str}, # Using email as subject, add roles
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
