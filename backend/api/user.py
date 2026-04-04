from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db_models.user import User
from backend.schemas.user import UserCreate, UserResponse

#tworzymy router pod adresem /users
router = APIRouter(prefix = "/users", tags = ["Użytkownicy"])

@router.post("/", response_model = UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ten email został już przypisany do istniejącego konta")

    new_user = User(
        first_name = user.first_name,
        last_name = user.last_name,
        email=user.email,
        password=user.password,
        role=user.role
    )

    #tu zapisujemy w bazie
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
