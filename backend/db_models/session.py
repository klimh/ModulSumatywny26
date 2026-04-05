from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.db.database import Base

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    rehab_id = Column(Integer, ForeignKey("rehab_plans.rehab_id"))
    patient_id = Column(Integer, ForeignKey("patients.user_id"))
    title = Column(String)
    is_active = Column(Boolean, default=True)

    results = relationship("ExerciseResult", back_populates="session")