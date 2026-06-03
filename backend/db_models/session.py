from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    rehab_id = Column(Integer, ForeignKey("rehab_plans.rehab_id"))
    patient_id = Column(Integer, ForeignKey("patients.user_id"))
    title = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    results = relationship("ExerciseResult", back_populates="session")