from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.core.security import RoleChecker
from backend.db_models.patient_physiotherapist import PatientPhysiotherapist
from backend.db_models.user import User
from typing import List
from backend.db_models.exercise import Exercise
from backend.db_models.rehab_plan import RehabPlan
from backend.db_models.rehab_plan_exercise import RehabPlanExercise
from backend.schemas.exercise import ExerciseCreate, ExerciseResponse
from backend.schemas.rehab_plan import RehabPlanCreate, RehabPlanResponse

router = APIRouter(
    prefix="/physio",
    tags=["Fizjoterapeuta"],
    dependencies=[Depends(RoleChecker(["fizjoterapeuta"]))]
)

@router.get("/my-patients")
def get_my_patients(current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
                    db: Session = Depends(get_db)):

    connections = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.physio_id == current_user.user_id,
        PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
    ).all()

    patient_ids = [c.patient_id for c in connections]
    patients = db.query(User).filter(User.user_id.in_(patient_ids)).all()
    return patients


@router.post("/exercises", response_model=ExerciseResponse)
def add_exercise(exercise: ExerciseCreate, db: Session = Depends(get_db)):
    """Dodaje nowe ćwiczenie do ogólnej bazy danych"""
    new_exercise = Exercise(**exercise.model_dump())
    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)
    return new_exercise


@router.get("/exercises", response_model=List[ExerciseResponse])
def get_all_exercises(db: Session = Depends(get_db)):
    """Pobiera listę wszystkich dostępnych ćwiczeń to samo co SELECT * FROM exercises"""
    return db.query(Exercise).all()



@router.post("/create-plan", response_model=RehabPlanResponse)
def create_rehabilitation_plan(
        plan_data: RehabPlanCreate,
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    """Tworzy plan rehabilitacji i przypisuje do niego wybrane ćwiczenia"""

    new_plan = RehabPlan(
        physio_id=current_user.user_id,
        patient_id=plan_data.patient_id,
        title=plan_data.title
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    for ex in plan_data.exercise:
        if not db.query(Exercise).filter(Exercise.exercise_id == ex.exercise_id).first():
            continue #walidacja integralności

        plan_exercise = RehabPlanExercise(
            rehab_id=new_plan.rehab_id,
            exercise_id=ex.exercise_id,
            reps_nr=ex.reps_nr,
            sets_nr=ex.sets_nr
        )
        db.add(plan_exercise)

    db.commit()
    return new_plan