"""Tabela laczaca pacjenta z fizjo"""
from sqlalchemy import Column, Integer, String, ForeignKey
from backend.db.database import Base

class PatientPhysiotherapist(Base):
    __tablename__ = "patient_physiotherapist"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.user_id"), nullable=False)
    physio_id = Column(Integer, ForeignKey("physiotherapists.user_id"), nullable=False)
    status = Column(String, default="OCZEKUJACE") #wg naszeo podzialu