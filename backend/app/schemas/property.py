from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.services.classification import VALID_VERIFIED_STATUSES, VALID_VERIFICATION_METHODS

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

    @field_validator("verified_status")
    @classmethod
    def check_verified_status(cls, v):
        if v is not None and v not in VALID_VERIFIED_STATUSES:
            raise ValueError(
                f"must be one of: {', '.join(sorted(VALID_VERIFIED_STATUSES))}"
            )
        return v

    @field_validator(
        "hs_verification_method", "ss_verification_method",
        "ub_mapped_private_method", "ub_mapped_public_method",
    )
    @classmethod
    def check_verification_method(cls, v):
        if v is not None and v not in VALID_VERIFICATION_METHODS:
            raise ValueError(
                f"must be one of: {', '.join(sorted(VALID_VERIFICATION_METHODS))}"
            )
        return v

class PropertyResponse(PropertyBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}