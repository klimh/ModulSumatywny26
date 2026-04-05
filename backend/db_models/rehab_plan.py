from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.db.database import Base

class RehabPlan(Base):
    __tablename__ = "rehab_plans"

    rehab_id = Column(Integer, primary_key=True, index=True)
    physio_id = Column(Integer, ForeignKey("physiotherapists.user_id"))
    patient_id = Column(Integer, ForeignKey("patients.user_id"))
    title = Column(String)
    is_active = Column(Boolean, default=True)

    exercises = relationship("RehabPlanExercise", back_populates = "plan")