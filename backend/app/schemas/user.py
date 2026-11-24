import datetime
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str | None = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, description="Password")


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth_provider: str
    is_active: bool
    created_at: datetime.datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthStatusResponse(BaseModel):
    supabase_configured: bool
    auth_mode: str
    jwks_available: bool
