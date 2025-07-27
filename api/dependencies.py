from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional
import os
from datetime import datetime

security = HTTPBearer()

# JWT configuration
SECRET_KEY = os.getenv("NEXTAUTH_SECRET", "development-secret")
ALGORITHM = "HS256"

class User:
    def __init__(self, id: str, email: str, role: str = "USER"):
        self.id = id
        self.email = email
        self.role = role

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Verify JWT token and return current user"""
    token = credentials.credentials
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return User(id=user_id, email=email, role=payload.get("role", "USER"))
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """Get user if authenticated, otherwise return None"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None