"""
Authentication system for Pravaha Flood Management System
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
from models.database import User, UserCreate, UserResponse, LoginRequest, Token, TokenData, UserRole

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security scheme
security = HTTPBearer()

# In-memory storage for demo (replace with MongoDB in production)
users_db: Dict[str, User] = {}

class AuthService:
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
        self.access_token_expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> TokenData:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            role: str = payload.get("role")
            
            if user_id is None or email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return TokenData(user_id=user_id, email=email, role=role)
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def register_user(self, user_data: UserCreate) -> UserResponse:
        """Register a new user"""
        # Check if user already exists
        for existing_user in users_db.values():
            if existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        # Create new user
        user = User(
            name=user_data.name,
            email=user_data.email,
            phone=user_data.phone,
            location=user_data.location,
            role=user_data.role,
            preferences=user_data.preferences,
            password_hash=self.hash_password(user_data.password)
        )
        
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

    def authenticate_user(self, email: str, password: str, role: UserRole) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = None
        for u in users_db.values():
            if u.email == email and u.role == role:
                user = u
                break
        
        if not user:
            return None
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        return user

    def login_user(self, login_data: LoginRequest) -> Token:
        """Login a user and return access token"""
        user = self.authenticate_user(login_data.email, login_data.password, login_data.role)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email, password, or role",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        users_db[user.id] = user
        
        # Create access token
        access_token_expires = timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user.id, "email": user.email, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=self.access_token_expire_minutes * 60,
            user=UserResponse(
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
        )

    def get_current_user(self, token: str) -> User:
        """Get current user from token"""
        token_data = self.verify_token(token)
        user = users_db.get(token_data.user_id)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user

    def get_current_active_user(self, token: str) -> User:
        """Get current active user from token"""
        user = self.get_current_user(token)
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return user

    def require_admin(self, token: str) -> User:
        """Require admin role for access"""
        user = self.get_current_active_user(token)
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return user

# Global auth service instance
auth_service = AuthService()

# Dependency functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """FastAPI dependency to get current user"""
    return auth_service.get_current_active_user(credentials.credentials)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """FastAPI dependency to get current admin user"""
    return auth_service.require_admin(credentials.credentials)

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """FastAPI dependency to get optional user (for public endpoints)"""
    if not credentials:
        return None
    try:
        return auth_service.get_current_active_user(credentials.credentials)
    except HTTPException:
        return None

# Utility functions
def create_demo_users():
    """Create demo users for testing"""
    demo_users = [
        UserCreate(
            name="Demo User",
            email="user@pravaha.com",
            password="user12345",
            phone="+919876543210",
            location="Delhi, India",
            role=UserRole.USER
        ),
        UserCreate(
            name="Admin User",
            email="admin@pravaha.com",
            password="admin12345",
            phone="+919876543211",
            location="Delhi, India",
            role=UserRole.ADMIN
        )
    ]
    
    for user_data in demo_users:
        try:
            auth_service.register_user(user_data)
            print(f"✅ Created demo user: {user_data.email}")
        except HTTPException as e:
            print(f"⚠️ User {user_data.email} already exists: {e.detail}")

# Initialize demo users
create_demo_users()
