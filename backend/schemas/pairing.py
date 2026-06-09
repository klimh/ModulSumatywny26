from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class PairingStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED_BY_PHYSIO = "ACCEPTED_BY_PHYSIO"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    COMPLETED = "COMPLETED"

class PairingRequestCreate(BaseModel):
    problem_description: str
    required_specialization: Optional[str] = None

class PairingRequestResponse(BaseModel):
    id: int
    patient_id: int
    physio_id: int
    problem_description: str
    status: PairingStatus
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    physio_name: Optional[str] = None

    class Config:
        from_attributes = True

class PhysioAvailabilityUpdate(BaseModel):
    is_available: bool
