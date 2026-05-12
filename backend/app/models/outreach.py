from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class OutreachLog(Base):
    __tablename__ = "outreach_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String, ForeignKey("properties.account_number"), nullable=False)
    attempt_number = Column(Integer)
    outreach_date = Column(DateTime(timezone=True))
    method = Column(String)
    outcome = Column(String)
    initials = Column(String)
    notes = Column(Text)
    is_customer_initiated = Column(Boolean, default=False)
    customer_initiated_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())