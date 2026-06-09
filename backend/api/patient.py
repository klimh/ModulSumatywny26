from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List
from db.database import get_db
from core.security import RoleChecker
from db_models.user import User
from db_models.rehab_plan import RehabPlan
from db_models.session import Session
from db_models.exercise_result import ExerciseResult
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.physiotherapist import Physiotherapist
from core.streaks import record_activity

router = APIRouter(
    prefix="/patient",
    tags=["Pacjent"],
    dependencies=[Depends(RoleChecker(["pacjent"]))]
)


@router.get("/my-physio")
def get_my_physiotherapist(
        current_user: User = Depends(RoleChecker(["pacjent"])),
        db: DBSession = Depends(get_db)
):
    """Zwraca fizjoterapeutę przypisanego do zalogowanego pacjenta (ZAAKCEPTOWANE lub OCZEKUJACE)"""
    connection = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.patient_id == current_user.user_id,
        PatientPhysiotherapist.status.in_(["ZAAKCEPTOWANE", "OCZEKUJACE"])
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Brak przypisanego fizjoterapeuty")

    physio_user = db.query(User).filter(User.user_id == connection.physio_id).first()
    physio_profile = db.query(Physiotherapist).filter(Physiotherapist.user_id == connection.physio_id).first()
    
    patient_count = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.physio_id == connection.physio_id,
        PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
    ).count()

    certificates = []
    if physio_profile and physio_profile.certificates:
        certificates = [
            {
                "certificate_id": cert.certificate_id,
                "name": cert.name,
                "file_url": cert.file_url,
                "is_verified": cert.is_verified
            } for cert in physio_profile.certificates
        ]

    return {
        "physio_id": physio_user.user_id,
        "first_name": physio_user.first_name,
        "last_name": physio_user.last_name,
        "email": physio_user.email,
        "status": connection.status,
        "specialization": physio_profile.specialization if physio_profile else None,
        "patient_count": patient_count,
        "certificates": certificates
    }


from schemas.rehab_plan import RehabPlanResponse

@router.get("/my-plan", response_model=RehabPlanResponse)
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

    exercises_with_names = []
    for pe in plan.exercises:
        exercises_with_names.append({
            "exercise_id": pe.exercise_id,
            "name": pe.exercise.name,
            "description": pe.exercise.description or "",
            "video_url": pe.exercise.video_url,
            "reps_nr": pe.reps_nr,
            "sets_nr": pe.sets_nr
        })

    return {
        "rehab_id": plan.rehab_id,
        "patient_id": plan.patient_id,
        "title": plan.title,
        "is_active": plan.is_active,
        "exercises": exercises_with_names
    }


@router.post("/submit-session")
def submit_exercise_session(
        rehab_id: int,
        results_list: List[dict],
        current_user: User = Depends(RoleChecker(["pacjent"])),
        db: DBSession = Depends(get_db)
):
    """Zapisuje wyniki ukończonej sesji ćwiczeń"""
    new_session = Session(
        rehab_id=rehab_id,
        patient_id=current_user.user_id,
        title="Training Session"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    for res in results_list:
        db_result = ExerciseResult(
            session_id=new_session.session_id,
            exercise_id=res["exercise_id"],
            reps_completed=res["reps"],
            avg_accuracy=res["accuracy"],
            ai_feedback=res.get("feedback", "Good job!"),
            pain_level=res.get("pain_level"),
            patient_note=res.get("patient_note")
        )
        db.add(db_result)

    streak = record_activity(db, current_user.user_id)
    db.commit()

    from core.badges import evaluate_and_award_badges
    new_badges = evaluate_and_award_badges(db, current_user.user_id, results_list, streak.current_streak)

    return {
        "message": "Sesja zapisana pomyślnie!",
        "session_id": new_session.session_id,
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "new_badges": new_badges
    }
