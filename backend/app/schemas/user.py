import datetime
import uuid
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    email: str
    full_name: str | None = None

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth_provider: str
    is_active: bool
    created_at: datetime.datetime

class AuthStatusResponse(BaseModel):
    supabase_configured: bool
    auth_mode: str
    jwks_available: bool
