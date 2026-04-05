from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List
from backend.db.database import get_db
from backend.core.security import RoleChecker
from backend.db_models.user import User
from backend.db_models.rehab_plan import RehabPlan
from backend.db_models.session import Session
from backend.db_models.exercise_result import ExerciseResult

router = APIRouter(
    prefix="/patient",
    tags=["Pacjent"],
    dependencies=[Depends(RoleChecker(["pacjent"]))]
)


@router.get("/my-plan")
def get_my_rehab_plan(
        current_user: User = Depends(RoleChecker(["pacjent"])),
        db: DBSession = Depends(get_db)
):
    """Pobieramy aktywny plan rehabilitacji zalogowanego pacjenta"""
    plan = db.query(RehabPlan).filter(
        RehabPlan.patient_id == current_user.user_id,
        RehabPlan.is_active == True
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Nie znaleziono aktywnego planu.")

    return plan


@router.post("/submit-session")
def submit_exercise_session(
        rehab_id: int,
        results_list: List[dict],
        current_user: User = Depends(RoleChecker(["pacjent"])),
        db: DBSession = Depends(get_db)
):
    """Zapisuje wyniki ukończonej sesji ćwiczeń"""
    #tworzymy nową sesję
    new_session = Session(
        rehab_id=rehab_id,
        patient_id=current_user.user_id,
        title="Sesja treningowa"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    #zapisujemy wyniki poszczególnych ćwiczeń
    for res in results_list:
        db_result = ExerciseResult(
            session_id=new_session.session_id,
            exercise_id=res["exercise_id"],
            reps_completed=res["reps"],
            avg_accuracy=res["accuracy"],
            ai_feedback=res.get("feedback", "Dobra robota!")
        )
        db.add(db_result)

    db.commit()
    return {"message": "Sesja zapisana pomyślnie!", "session_id": new_session.session_id}