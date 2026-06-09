from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base
from datetime import datetime

class PairingRequest(Base):
    __tablename__ = "pairing_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.user_id"), nullable=False)
    physio_id = Column(Integer, ForeignKey("physiotherapists.user_id"), nullable=False)
    problem_description = Column(String, nullable=False)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacje - opcjonalne, ale mogą się przydać
    patient = relationship("Patient", backref="pairing_requests")
    physio = relationship("Physiotherapist", backref="pairing_requests")
