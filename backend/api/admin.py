from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from core.security import RoleChecker, get_password_hash
from db_models.user import User
from db_models.physiotherapist import Physiotherapist
from schemas.user import UserResponse
from pydantic import BaseModel
from typing import List, Optional
from db_models.certificate import Certificate
from schemas.certificate import CertificateResponse

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(RoleChecker(["admin"]))]
)


class PhysioCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    specialization: Optional[str] = None


@router.post("/create-physio", response_model=UserResponse)
def create_physiotherapist(
        data: PhysioCreate,
        current_user: User = Depends(RoleChecker(["admin"])),
        db: Session = Depends(get_db)
):
    """Admin tworzy nowe konto fizjoterapeuty"""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ten email jest już zajęty")

    hashed_password = get_password_hash(data.password)

    new_user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hashed_password,
        role="fizjoterapeuta"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_physio = Physiotherapist(
        user_id=new_user.user_id,
        specialization=data.specialization,
        is_verified=True
    )
    db.add(new_physio)
    db.commit()

    return new_user


@router.get("/physiotherapists", response_model=List[UserResponse])
def list_physiotherapists(
        current_user: User = Depends(RoleChecker(["admin"])),
        db: Session = Depends(get_db)
):
    """Lista wszystkich fizjoterapeutów"""
    return db.query(User).filter(User.role == "fizjoterapeuta").all()


@router.delete("/physiotherapist/{user_id}")
def delete_physiotherapist(
        user_id: int,
        current_user: User = Depends(RoleChecker(["admin"])),
        db: Session = Depends(get_db)
):
    """Usuwa konto fizjoterapeuty"""
    user = db.query(User).filter(User.user_id == user_id, User.role == "fizjoterapeuta").first()
    if not user:
        raise HTTPException(status_code=404, detail="Fizjoterapeuta nie znaleziony")

    # Usuń profil fizjo
    physio = db.query(Physiotherapist).filter(Physiotherapist.user_id == user_id).first()
    if physio:
        db.delete(physio)

    db.delete(user)
    db.commit()
    return {"message": "Fizjoterapeuta został usunięty"}

@router.get("/certificates", response_model=List[CertificateResponse])
def list_certificates(
        current_user: User = Depends(RoleChecker(["admin"])),
        db: Session = Depends(get_db)
):
    """Pobiera wszystkie certyfikaty w systemie"""
    return db.query(Certificate).all()

@router.post("/certificates/{certificate_id}/verify", response_model=CertificateResponse)
def verify_certificate(
        certificate_id: int,
        verify: bool = True,
        current_user: User = Depends(RoleChecker(["admin"])),
        db: Session = Depends(get_db)
):
    """Administrator zatwierdza (lub cofa zatwierdzenie) certyfikatu"""
    cert = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certyfikat nie znaleziony")
    
    cert.is_verified = verify
    db.commit()
    db.refresh(cert)
    return cert
