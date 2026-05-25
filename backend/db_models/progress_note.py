from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base

class ProgressNote(Base):
    __tablename__ = "progress_notes"

    note_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.user_id"), nullable=False)
    physio_id = Column(Integer, ForeignKey("physiotherapists.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    note_content = Column(String, nullable=False)
    pain_level = Column(Integer, nullable=True) # 1-10 scale
    mobility_level = Column(Integer, nullable=True) # 1-10 scale
