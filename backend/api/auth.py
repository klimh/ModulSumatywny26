from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db_models.user import User
from backend.core.security import verify_password, create_access_token
from backend.schemas.token import Token

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