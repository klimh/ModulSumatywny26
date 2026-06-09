import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db.database import get_db
from db_models.user import User
from core.security import verify_password, create_access_token
from schemas.token import Token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter(tags=["Autoryzacja"])

@router.post("/login",response_model=Token)
def login_fo_access_token(form_data: OAuth2PasswordRequestForm = Depends(),
                          db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Niepoprawny email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},

        )
    access_token = create_access_token(
        data={"sub": str(user.email), "role": user.role, "user_id": user.user_id}
    )

    return {"access_token": access_token, "token_type": "bearer"}

import secrets
from core.security import get_current_user

@router.post("/api-key/generate")
def generate_api_key(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_key = secrets.token_urlsafe(32)
    current_user.api_key = new_key
    db.commit()
    return {"api_key": new_key}

@router.get("/api-key")
def get_api_key(current_user: User = Depends(get_current_user)):
    return {"api_key": current_user.api_key}