from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.database import Base

class Physiotherapist(Base):
    __tablename__ = "physiotherapists"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    specialization = Column(String, nullable=True) #zgodnie z naszymi zalozeniami
    is_verified = Column(Boolean, default=False) #admin bedzie weryfikowal

    user = relationship("User", back_populates="physio_profile")
