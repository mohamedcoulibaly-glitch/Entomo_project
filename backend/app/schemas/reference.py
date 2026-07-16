from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class ReferenceDataBase(BaseModel):
    category: str
    code: str
    label: str
    description: Optional[str] = None
    order_index: int = 0
    active: bool = True
    metadata_json: Optional[str] = None


class ReferenceDataCreate(ReferenceDataBase):
    pass


class ReferenceDataUpdate(BaseModel):
    category: Optional[str] = None
    code: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    active: Optional[bool] = None
    metadata_json: Optional[str] = None


class ReferenceDataResponse(BaseSchema, ReferenceDataBase):
    pass


class ReferenceDataListResponse(BaseModel):
    items: list[ReferenceDataResponse]
    total: int


class ReferenceDataFullResponse(BaseSchema, ReferenceDataBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config: from_attributes = True
