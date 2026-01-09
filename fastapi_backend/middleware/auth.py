from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
from fastapi_backend.auth import verify_token
from fastapi_backend.database import get_supabase_client

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current user from JWT token"""
    token = credentials.credentials

    try:
        payload = verify_token(token)
    except RuntimeError as e:
        # Configuration error (missing secret) - do not expose internal details to clients
        logger.exception("JWT configuration error: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server configuration error")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("userId")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify user exists in database
    supabase = get_supabase_client()
    try:
        response = supabase.table('users').select('id, name, email').eq('id', user_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        user = response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Database error while fetching user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error",
        )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "userId": user_id  # Keep for compatibility
    }