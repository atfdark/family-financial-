import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional

from config import settings
from database import get_supabase_client
from models import LoginRequest, RegisterRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Password hashing context (though we'll use Supabase auth)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = settings.jwt_secret.get_secret_value()
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_HOURS = settings.jwt_expiration_hours

# Security scheme for token
security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        if user_id is None or email is None:
            raise JWTError("Invalid token payload")
        return {"id": user_id, "email": email}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return verify_token(credentials.credentials)

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    """Register a new user with Supabase and return JWT token"""
    supabase = get_supabase_client()

    try:
        # Register with Supabase
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "name": request.username or ""
                }
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )

        user = auth_response.user

        # Create JWT token with user info
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.user_metadata.get("name", "") if user.user_metadata else ""
        }
        access_token = create_access_token(token_data)

        return TokenResponse(
            message="Registration successful",
            token=access_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.user_metadata.get("name", "") if user.user_metadata else ""
            }
        )

    except Exception as e:
        logger.exception("Registration failed for email: %s", request.email)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate user with Supabase and return JWT token"""
    supabase = get_supabase_client()

    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        user = auth_response.user
        session = auth_response.session

        # Create JWT token with user info
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.user_metadata.get("name", "") if user.user_metadata else ""
        }
        access_token = create_access_token(token_data)

        return TokenResponse(
            message="Login successful",
            token=access_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.user_metadata.get("name", "") if user.user_metadata else ""
            }
        )

    except Exception as e:
        logger.exception("Login failed for email: %s", request.email)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )