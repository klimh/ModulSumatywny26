from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class ExerciseResult(Base):
    __tablename__ = "exercise_results"

    result_id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercise.exercise_id"))
    session_id = Column(Integer, ForeignKey("sessions.session_id"))
    reps_completed = Column(Integer)
    avg_accuracy = Column(Float)
    ai_feedback = Column(String)
    max_rom = Column(Float, nullable=True)
    pain_level = Column(Integer, nullable=True)
    patient_note = Column(String, nullable=True)

    session = relationship("Session", back_populates="results")