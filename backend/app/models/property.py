from sqlalchemy import Column, Index, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class Property(Base):
    __tablename__ = "properties"

    account_number = Column(String(20), primary_key=True)
    service_file_number = Column(String(20))
    acct_status = Column(String(20))
    address = Column(String(100), nullable=False)
    zip = Column(String(10))
    hs_service = Column(String(50))
    ss_service = Column(String(50))
    ub_private_side = Column(String(50))
    ub_utility_side = Column(String(50))
    ub_sl_category = Column(String(50))
    ub_account_type = Column(String(50))
    ub_mapped_private_method = Column(String(100))
    ub_mapped_public_method = Column(String(100))
    hs_verification_method = Column(String(100))
    ss_verification_method = Column(String(100))
    ss_previously_lead = Column(String(20))
    verified_status = Column(String(50), server_default="Pending")
    springbrook_synced_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_properties_address", "address"),
        Index("idx_properties_status", "verified_status"),
    )
