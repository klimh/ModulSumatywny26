from pydantic import BaseModel
from typing import Optional

class CertificateResponse(BaseModel):
    certificate_id: int
    physio_id: int
    name: str
    file_url: str
    is_verified: bool

    class Config:
        from_attributes = True
