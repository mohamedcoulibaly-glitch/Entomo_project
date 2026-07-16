from sqlalchemy import Column, String, Integer, Text, Boolean, UniqueConstraint
from app.models.base import BaseModel


class ReferenceData(BaseModel):
    __tablename__ = "reference_data"

    category = Column(String(100), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    label = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    metadata_json = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("category", "code", name="uq_reference_category_code"),
    )
