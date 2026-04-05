from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.database import Base

class RehabPlanExercise(Base):
    __tablename__ = "rehab_plan_exercises"

    id = Column(Integer, primary_key=True, index=True)
    rehab_id = Column(Integer, ForeignKey("rehab_plans.rehab_id"))
    exercise_id = Column(Integer, ForeignKey("exercises.exercise_id"))
    reps_nr = Column(Integer) #liczba powtorzen
    sets_nr = Column(Integer)  #liczba serii

    plan = relationship("RehabPlan", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="plans")