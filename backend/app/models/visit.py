from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base

class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String, ForeignKey("properties.account_number"), nullable=False)
    initials = Column(String)
    visited_at = Column(DateTime(timezone=True), server_default=func.now())
    access_granted = Column(String)
    verification_outcome = Column(String)
    property_type = Column(String)
    notes = Column(Text)
    photo_urls = Column(JSONB)
    work_order_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())