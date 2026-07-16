from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class NotificationBase(BaseModel):
    titre: str
    message: Optional[str] = None
    type_notification: str = "info"
    module: Optional[str] = None
    lien: Optional[str] = None

class NotificationCreate(NotificationBase):
    utilisateur_id: int

class NotificationResponse(NotificationBase):
    id: int
    utilisateur_id: int
    lu: bool
    date_lecture: Optional[datetime] = None
    created_at: Optional[datetime] = None
    class Config: from_attributes = True
