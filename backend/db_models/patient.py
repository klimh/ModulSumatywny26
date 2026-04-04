from sqlalchemy import Column, Integer, Date, ForeignKey
from backend.db.database import Base

class Patient(Base):
    __tablename__ = "patients"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    streak_count = Column(Integer, default=0)
    last_activity = Column(Date, nullable=True)
