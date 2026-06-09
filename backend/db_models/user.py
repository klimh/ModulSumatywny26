from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from db.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=True)

    #relacje do profili:
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    physio_profile = relationship("Physiotherapist", back_populates="user", uselist=False)
    exercises = relationship("Exercise", back_populates="author")