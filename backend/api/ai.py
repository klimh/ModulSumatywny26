from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db_models.exercise import Exercise

router = APIRouter(prefix="/ai", tags=["Moduł AI"])

@router.get("/pattern/{exercise_id}")
def get_exercise_pattern(exercise_id: int, db: Session = Depends(get_db)):
    """Pobiera dane wzorcowe dla mediapipe dla konkretnego ćwiczenia"""
    exercise = db.query(Exercise).filter(Exercise.exercise_id == exercise_id).first()
    if not exercise:
        return {"error": "Ćwiczenie nie istnieje"}
    return {"pattern": exercise.mediapipe_pattern_data}