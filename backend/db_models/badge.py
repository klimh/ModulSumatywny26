from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.database import Base

class PatientBadge(Base):
    __tablename__ = "patient_badges"
    
    badge_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    badge_type = Column(String, nullable=False, index=True)
    earned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
