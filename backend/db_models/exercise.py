from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from backend.db.database import Base

class Exercise(Base):
    __tablename__ = "exercise"

    exercise_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    video_url = Column(String)
    mediapipe_pattern_data = Column(Text) #tu beda dane wzorcowe do AI

    plans = relationship("RehabPlanExercise", back_populates = "exercise")