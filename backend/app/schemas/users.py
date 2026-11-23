from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    password: str
    role: str

    # backend will set these; frontend should NOT send them
    tenant_id: Optional[int] = None
    is_approved: Optional[bool] = True
    status: Optional[str] = "active"

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    tenant_code: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    captcha_response: Optional[str] = None 

class UserOut(BaseModel):
    id: int
    name: str
    firstName: str
    lastName: str
    email: str
    phoneNumber: Optional[str] = None
    role: str
    status: str
    isApproved: bool
    tenantId: int
    createdAt: datetime
    lastActive: Optional[datetime]

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    firstName: Optional[str] = Field(default=None, alias="first_name")
    lastName: Optional[str] = Field(default=None, alias="last_name")
    email: Optional[EmailStr] = None
    phoneNumber: Optional[str] = None
    role: Optional[str] = None
    isApproved: Optional[bool] = Field(default=None, alias="is_approved")
    status: Optional[str] = None

    class Config:
          populate_by_name = True
          from_attributes = True


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class StatsOut(BaseModel):
    total_users: int
    admins: int
    active_users: int
    last_active: Optional[datetime] = None
