from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PropertyBase(BaseModel):
    account_number: str
    service_file_number: Optional[str] = None
    acct_status: Optional[str] = None
    address: Optional[str] = None
    zip: Optional[str] = None
    hs_service: Optional[str] = None
    ss_service: Optional[str] = None
    ub_private_side: Optional[str] = None
    ub_utility_side: Optional[str] = None
    ub_sl_category: Optional[str] = None
    ub_account_type: Optional[str] = None
    ub_mapped_private_method: Optional[str] = None
    ub_mapped_public_method: Optional[str] = None
    hs_verification_method: Optional[str] = None
    ss_verification_method: Optional[str] = None
    ss_previously_lead: Optional[str] = None
    verified_status: Optional[str] = "Pending"
    springbrook_synced_at: Optional[datetime] = None

class PropertyUpdate(BaseModel):
    verified_status: Optional[str] = None
    hs_verification_method: Optional[str] = None
    ss_verification_method: Optional[str] = None
    ub_mapped_private_method: Optional[str] = None
    ub_mapped_public_method: Optional[str] = None

class PropertyResponse(PropertyBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}