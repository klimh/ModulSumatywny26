from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class Certificate(Base):
    __tablename__ = "certificates"

    certificate_id = Column(Integer, primary_key=True, index=True)
    physio_id = Column(Integer, ForeignKey("physiotherapists.user_id"), nullable=False)
    name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)

    physiotherapist = relationship("Physiotherapist", back_populates="certificates")
