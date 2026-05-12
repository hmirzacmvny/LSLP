from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class Property(Base):
    __tablename__ = "properties"

    account_number = Column(String, primary_key=True)
    service_file_number = Column(String)
    acct_status = Column(String)
    address = Column(String)
    zip = Column(String)
    hs_service = Column(String)
    ss_service = Column(String)
    ub_private_side = Column(String)
    ub_utility_side = Column(String)
    ub_sl_category = Column(String)
    ub_account_type = Column(String)
    ub_mapped_private_method = Column(String)
    ub_mapped_public_method = Column(String)
    hs_verification_method = Column(String)
    ss_verification_method = Column(String)
    ss_previously_lead = Column(String)
    verified_status = Column(String, default="Pending")
    springbrook_synced_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())