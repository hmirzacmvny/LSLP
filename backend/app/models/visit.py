from sqlalchemy import Boolean, Column, Date, Index, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base

class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String(20), ForeignKey("properties.account_number"), nullable=False)
    initials = Column(String(10))
    visited_at = Column(DateTime(timezone=True), server_default=func.now())
    access_granted = Column(String(30))
    verification_outcome = Column(String(50))
    property_type = Column(String(50))
    notes = Column(Text)
    photo_urls = Column(JSONB, server_default="'[]'")
    gps_coordinates = Column(JSONB)
    work_order_id = Column(String(50))
    created_by_uid = Column(String(128))
    entered_by_uid = Column(String(128))
    follow_up_date = Column(Date)
    needs_return = Column(Boolean, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_visits_account", "account_number"),
        Index("idx_visits_visited_at", "visited_at"),
    )
