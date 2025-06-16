from typing import Generator, Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import SECRET_KEY, ALGORITHM
from app.db import get_db 
from app.model.model import User as UserModel 
from app.schema.token import TokenData
from app.schema.user import UserInDb 
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
        username: str = payload["sub"]       
        token_data = TokenData(username=username, roles=payload.get("roles")) 
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserModel).filter(UserModel.email == token_data.username).first() # Or student_id based on what's in 'sub'
    if user is None:
        user = db.query(UserModel).filter(UserModel.student_id == token_data.username).first()
        if user is None:
            raise credentials_exception
    # db.refresh(user)
    return user


