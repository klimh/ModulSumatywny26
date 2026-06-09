from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class Exercise(Base):
    __tablename__ = "exercise"

    exercise_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    video_url = Column(String)
    mediapipe_pattern_data = Column(Text)
    author_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    author = relationship("User", back_populates="exercises")
    plans = relationship("RehabPlanExercise", back_populates = "exercise")