from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProgressNoteBase(BaseModel):
    note_content: str
    pain_level: Optional[int] = None
    mobility_level: Optional[int] = None

class ProgressNoteCreate(ProgressNoteBase):
    patient_id: int

class ProgressNoteResponse(ProgressNoteBase):
    note_id: int
    patient_id: int
    physio_id: int
    created_at: datetime

    class Config:
        from_attributes = True
