from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.user import User
from db_models.patient import Patient
from db_models.physiotherapist import Physiotherapist
from schemas.user import UserCreate, UserResponse, UserRegister
from core.security import get_password_hash, get_current_user, RoleChecker

#tworzymy router pod adresem /users
router = APIRouter(prefix = "/users", tags = ["Użytkownicy"])

@router.post("/register", response_model = UserResponse)
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ten email został już przypisany do istniejącego konta")

    hashed_password = get_password_hash(user.password)

    new_user = User(
        first_name = user.first_name,
        last_name = user.last_name,
        email=user.email,
        password=hashed_password,
        role="pacjent"
    )

    #tu zapisujemy w bazie
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Rejestracja z zewnątrz zawsze tworzy pacjenta
    new_profile = Patient(user_id = new_user.user_id)
    db.add(new_profile)
    db.commit()

    return new_user

@router.get("/me", response_model = UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/request-physio/{physio_id}")
def request_physiotherapist(
        physio_id: int,
        current_user: User = Depends(RoleChecker(["pacjent"])),
        db: Session = Depends(get_db)
):

    physio = db.query(Physiotherapist).filter(Physiotherapist.user_id == physio_id).first()
    if not physio:
        raise HTTPException(status_code=404, detail="Fizjoterapeuta nie istnieje")

    new_match = PatientPhysiotherapist(
        patient_id=current_user.user_id,
        physio_id=physio_id,
        status="OCZEKUJACE"
    )
    db.add(new_match)
    db.commit()
    return {"message": "Prośba o parowanie została wysłana"}
