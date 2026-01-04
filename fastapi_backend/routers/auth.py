from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from models import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from auth import verify_password, get_password_hash, create_access_token
from database import get_supabase_admin_client
from middleware.auth import get_current_user

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """User login endpoint"""
    supabase = get_supabase_admin_client()

    try:
        # Get user from database
        response = supabase.table('users').select('id, name, email, password_hash').eq('email', request.email).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        user = response.data[0]

        # Verify password
        if not verify_password(request.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Create JWT token
        token = create_access_token({
            "userId": str(user['id']),
            "name": user['name'],
            "email": user['email']
        })

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    """User registration endpoint"""
    supabase = get_supabase_admin_client()

    try:
        # Hash password
        password_hash = get_password_hash(request.password)

        # Create user
        user_data = {
            "name": request.username,
            "email": request.username,  # Using username as email for compatibility
            "password_hash": password_hash
        }

        response = supabase.table('users').insert(user_data).select().execute()

        if not response.data:
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
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = get_current_user):
    """Get current user information"""
    return UserResponse(user=current_user)

@router.post("/logout")
async def logout():
    """User logout endpoint (client-side token removal)"""
    return {"message": "Logout successful"}