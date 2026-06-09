from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from core.security import get_user_from_api_key
from db_models.user import User
from api.progress import _build_patient_summary

router = APIRouter(
    prefix="/external/v1",
    tags=["Integracje Zewnętrzne"]
)

@router.get("/stats")
def get_external_stats(
    current_user: User = Depends(get_user_from_api_key),
    db: Session = Depends(get_db)
):
    """
    Pobiera zagregowane statystyki pacjenta używając X-API-Key.
    Dostępne dla zewnętrznych widgetów i systemów.
    """
    if current_user.role != "pacjent":
        return {"error": "Tylko konta pacjentów posiadają statystyki."}
        
    return _build_patient_summary(current_user.user_id, current_user, db)
