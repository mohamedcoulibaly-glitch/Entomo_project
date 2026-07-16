from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from app.schemas.base import BaseSchema


class RoleSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    etablissement: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    telephone: Optional[str] = None
    is_active: bool = True
    role_id: Optional[int] = None
    last_login: Optional[datetime] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    etablissement: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    telephone: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[int] = None
    password: Optional[str] = None


class UserResponse(BaseSchema, UserBase):
    is_superuser: bool = False
    role: Optional[RoleSimple] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
