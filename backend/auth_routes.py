"""
Authentication API routes for Pravaha Flood Management System
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from models.database import UserCreate, UserResponse, LoginRequest, Token, UserUpdate
from auth import auth_service, get_current_user, get_current_admin, security
from typing import List

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """
    Register a new user account
    """
    try:
        user = auth_service.register_user(user_data)
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login_user(login_data: LoginRequest):
    """
    Login user and get access token
    """
    try:
        token = auth_service.login_user(login_data)
        return token
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current user information
    """
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update current user information
    """
    try:
        # Get the full user object from auth service
        user = auth_service.get_current_user(
            # This would need the actual token, but for demo we'll use the user_id
            # In a real implementation, you'd pass the token from the request
            ""
        )
        
        # Update user fields
        if user_update.name is not None:
            user.name = user_update.name
        if user_update.email is not None:
            user.email = user_update.email
        if user_update.phone is not None:
            user.phone = user_update.phone
        if user_update.location is not None:
            user.location = user_update.location
        if user_update.preferences is not None:
            user.preferences = user_update.preferences
        
        # Save updated user (in production, this would be a database update)
        from auth import users_db
        users_db[user.id] = user
        
        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            location=user.location,
            role=user.role,
            preferences=user.preferences,
            is_active=user.is_active,
            registered_at=user.registered_at,
            last_login=user.last_login
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {str(e)}"
        )

@router.post("/logout")
async def logout_user(current_user: UserResponse = Depends(get_current_user)):
    """
    Logout user (in a real implementation, you'd invalidate the token)
    """
    return {"message": "Successfully logged out"}

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(current_user: UserResponse = Depends(get_current_admin)):
    """
    Get all users (admin only)
    """
    try:
        from auth import users_db
        users = []
        for user in users_db.values():
            users.append(UserResponse(
                id=user.id,
                name=user.name,
                email=user.email,
                phone=user.phone,
                location=user.location,
                role=user.role,
                preferences=user.preferences,
                is_active=user.is_active,
                registered_at=user.registered_at,
                last_login=user.last_login
            ))
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users: {str(e)}"
        )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, current_user: UserResponse = Depends(get_current_admin)):
    """
    Get user by ID (admin only)
    """
    try:
        from auth import users_db
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            location=user.location,
            role=user.role,
            preferences=user.preferences,
            is_active=user.is_active,
            registered_at=user.registered_at,
            last_login=user.last_login
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )

@router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, current_user: UserResponse = Depends(get_current_admin)):
    """
    Activate/deactivate user (admin only)
    """
    try:
        from auth import users_db
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = not user.is_active
        users_db[user.id] = user
        
        return {
            "message": f"User {'activated' if user.is_active else 'deactivated'} successfully",
            "user_id": user_id,
            "is_active": user.is_active
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user status: {str(e)}"
        )

@router.get("/stats")
async def get_auth_stats(current_user: UserResponse = Depends(get_current_admin)):
    """
    Get authentication statistics (admin only)
    """
    try:
        from auth import users_db
        total_users = len(users_db)
        active_users = len([u for u in users_db.values() if u.is_active])
        admin_users = len([u for u in users_db.values() if u.role.value == "admin"])
        user_users = len([u for u in users_db.values() if u.role.value == "user"])
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "admin_users": admin_users,
            "regular_users": user_users,
            "last_updated": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )

@router.post("/verify-token")
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify if a token is valid
    """
    try:
        token_data = auth_service.verify_token(credentials.credentials)
        return {
            "valid": True,
            "user_id": token_data.user_id,
            "email": token_data.email,
            "role": token_data.role
        }
    except HTTPException as e:
        return {
            "valid": False,
            "error": e.detail
        }

@router.get("/demo-users")
async def get_demo_users():
    """
    Get demo users for testing (public endpoint)
    """
    return {
        "demo_users": [
            {
                "email": "user@pravaha.com",
                "password": "user12345",
                "role": "user",
                "description": "Regular citizen user"
            },
            {
                "email": "admin@pravaha.com",
                "password": "admin12345",
                "role": "admin",
                "description": "Government admin user"
            }
        ],
        "note": "These are demo accounts for testing purposes"
    }
