from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db_models.user import User
from backend.schemas.user import UserCreate, UserResponse

#tworzymy router pod adresem /users
router = APIRouter(prefix = "/users", tags = ["Użytkownicy"])

@router.post("/", response_model = UserResponse)
def create_user():
    pass
