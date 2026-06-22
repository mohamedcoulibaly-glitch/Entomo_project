from typing import Optional, List
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class PermissionBase(BaseModel):
    name: str
    code: str
    module: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(BaseSchema, PermissionBase):
    pass


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(BaseSchema, RoleBase):
    permissions: List[PermissionResponse] = []
