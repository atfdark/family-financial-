import logging
from fastapi import APIRouter, HTTPException, status, Depends, Response
from fastapi.responses import JSONResponse
from models import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from auth import verify_password, get_password_hash, create_access_token, DUMMY_HASH
from database import get_supabase_admin_client
from config import settings
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response):
    """User login endpoint"""
    supabase = get_supabase_admin_client()

    try:
        # Get user from database
        response = supabase.table('users').select('id, name, email, password_hash').eq('email', request.email).execute()

        user = response.data[0] if (response.data and len(response.data) > 0) else None

        # Always compare a password hash to mitigate timing attacks
        hash_to_compare = user['password_hash'] if user and 'password_hash' in user else DUMMY_HASH
        password_ok = verify_password(request.password, hash_to_compare)

        if not password_ok or user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Create JWT token (create_access_token will validate JWT secret)
        token = create_access_token({
            "userId": str(user['id']),
            "name": user['name'],
            "email": user['email']
        })

        # Set httpOnly cookie for the token (clients should prefer httpOnly cookie over localStorage)
        cookie_secure = not getattr(settings, "debug", False)
        response.set_cookie("jwt_token", token, httponly=True, secure=cookie_secure, samesite="lax", path="/")

        return TokenResponse(
            message="Login successful",
            token=token,
            user={
                "id": str(user['id']),
                "name": user['name'],
                "email": user['email']
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, response: Response):
    """User registration endpoint"""
    supabase = get_supabase_admin_client()

    try:
        # Hash password
        password_hash = get_password_hash(request.password)

        # Validate email
        email = request.email
        username = request.username or ""

        # Create user
        user_data = {
            "name": username,
            "email": email,
            "password_hash": password_hash
        }

        response = supabase.table('users').insert(user_data).select().execute()

        if not response.data or len(response.data) == 0:
            logger.exception("Registration response missing data: %s", getattr(response, 'error', None))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed"
            )

        user = response.data[0]

        # Create JWT token
        token = create_access_token({
            "userId": str(user['id']),
            "name": user['name'],
            "email": user['email']
        })

        # Set httpOnly cookie for the token so browsers can use it automatically
        cookie_secure = not getattr(settings, "debug", False)
        response.set_cookie("jwt_token", token, httponly=True, secure=cookie_secure, samesite="lax", path="/")

        return TokenResponse(
            message="Registration successful",
            token=token,
            user={
                "id": str(user['id']),
                "name": user['name'],
                "email": user['email']
            }
        )

    except Exception as e:
        logger.exception("Registration failed")
        # Try to detect a unique/duplicate constraint but log full exception for diagnostics
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username or email already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(user=current_user)

@router.post("/logout")
async def logout(response: Response):
    """User logout endpoint: clear auth cookie"""
    # Clear the httpOnly auth cookie (if used)
    response.delete_cookie("jwt_token", path="/")
    return {"message": "Logout successful"}