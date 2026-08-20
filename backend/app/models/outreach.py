from sqlalchemy import Column, Date, Index, Integer, SmallInteger, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class OutreachLog(Base):
    __tablename__ = "outreach_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String(20), ForeignKey("properties.account_number"), nullable=False)
    attempt_number = Column(SmallInteger)
    outreach_date = Column(Date)
    method = Column(String(50))
    outcome = Column(Text)
    initials = Column(String(10))
    notes = Column(Text)
    is_customer_initiated = Column(Boolean, server_default="false")
    customer_initiated_notes = Column(Text)
    created_by_uid = Column(String(128))
    follow_up_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_outreach_account", "account_number"),
        Index("idx_outreach_date", "outreach_date"),
    )
