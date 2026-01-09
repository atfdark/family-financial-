from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pre-compute a dummy hash to mitigate timing attacks when user is missing
DUMMY_PASSWORD = "DUMMY_PASSWORD_FOR_TIMING_ATTACKS"
DUMMY_HASH = pwd_context.hash(DUMMY_PASSWORD)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token (returns str). Fails if JWT secret is not configured."""
    if not settings.jwt_secret or not str(settings.jwt_secret).strip():
        raise RuntimeError("JWT secret is not configured")

    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)

    # Use numeric exp as required by JWT spec
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    if not settings.jwt_secret or not str(settings.jwt_secret).strip():
        raise RuntimeError("JWT secret is not configured")

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None