from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.database import Base

class ExerciseResult(Base):
    __tablename__ = "exercise_results"

    result_id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercise.exercise_id"))
    session_id = Column(Integer, ForeignKey("sessions.session_id"))
    reps_completed = Column(Integer)
    avg_accuracy = Column(Float) # dokładność analizy przez AI
    ai_feedback = Column(String)

    session = relationship("Session", back_populates="results")