import re
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from db.database import get_db
from core.security import RoleChecker
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.user import User
from typing import List
from db_models.exercise import Exercise
from db_models.rehab_plan import RehabPlan
from db_models.rehab_plan_exercise import RehabPlanExercise
from schemas.exercise import ExerciseCreate, ExerciseResponse
from schemas.rehab_plan import RehabPlanCreate, RehabPlanResponse

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
    db.query(RehabPlan).filter(
        RehabPlan.patient_id == plan_data.patient_id,
        RehabPlan.is_active == True
    ).update({"is_active": False})

    new_plan = RehabPlan(
        physio_id=current_user.user_id,
        patient_id=plan_data.patient_id,
        title=plan_data.title or "Plan Rehabilitacji"
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    exercises_with_names = []
    for ex in plan_data.exercise:
        db_ex = db.query(Exercise).filter(Exercise.exercise_id == ex.exercise_id).first()
        if not db_ex:
            continue
            
        if not db_ex.video_url:
            raise HTTPException(status_code=400, detail=f"Ćwiczenie '{db_ex.name}' nie ma przypisanego wideo. Każde ćwiczenie w planie musi posiadać wideo.")

        plan_exercise = RehabPlanExercise(
            rehab_id=new_plan.rehab_id,
            exercise_id=ex.exercise_id,
            reps_nr=ex.reps_nr,
            sets_nr=ex.sets_nr
        )
        db.add(plan_exercise)
        exercises_with_names.append({
            "exercise_id": ex.exercise_id,
            "name": db_ex.name,
            "description": db_ex.description or "",
            "video_url": db_ex.video_url,
            "reps_nr": ex.reps_nr,
            "sets_nr": ex.sets_nr
        })

    db.commit()
    
    return {
        "rehab_id": new_plan.rehab_id,
        "patient_id": new_plan.patient_id,
        "title": new_plan.title,
        "is_active": new_plan.is_active,
        "exercises": exercises_with_names
    }


@router.get("/my-plans", response_model=List[RehabPlanResponse])
def get_my_created_plans(
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    """Pobiera listę planów stworzonych przez fizjoterapeutę"""
    plans = db.query(RehabPlan).filter(RehabPlan.physio_id == current_user.user_id).all()
    
    result = []
    for plan in plans:
        exs = []
        for pe in plan.exercises:
            exs.append({
                "exercise_id": pe.exercise_id,
                "name": pe.exercise.name,
                "description": pe.exercise.description or "",
                "video_url": pe.exercise.video_url,
                "reps_nr": pe.reps_nr,
                "sets_nr": pe.sets_nr
            })
        result.append({
            "rehab_id": plan.rehab_id,
            "patient_id": plan.patient_id,
            "title": plan.title,
            "is_active": plan.is_active,
            "exercises": exs
        })
    return result


@router.get("/pending-requests")
def get_pending_requests(
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    """Fizjoterapeuta przegląda oczekujące prośby od pacjentów"""
    return db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.physio_id == current_user.user_id,
        PatientPhysiotherapist.status == "OCZEKUJACE"
    ).all()


@router.post("/respond-request/{request_id}")
def respond_to_request(
        request_id: int,
        accept: bool,
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    request = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.id == request_id,
        PatientPhysiotherapist.physio_id == current_user.user_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Nie znaleziono prośby")

    request.status = "ZAAKCEPTOWANE" if accept else "ODRZUCONE"
    db.commit()
    return {"message": f"Status prośby zaktualizowany na: {request.status}"}


@router.post("/exercises/{exercise_id}/upload-video")
def upload_exercise_video(
        exercise_id: int,
        file: UploadFile = File(...),
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    """Dodaje filmik instruktażowy do ćwiczenia (upload do Cloudinary)"""
    exercise = db.query(Exercise).filter(Exercise.exercise_id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Ćwiczenie nie istnieje")

    # Walidacja typu pliku
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nieobsługiwany format wideo. Dozwolone: MP4, WebM, MOV, AVI")

    # Usunięcie starego filmiku z Cloudinary jeśli istnieje
    if exercise.video_url:
        _delete_cloudinary_video(exercise.video_url)

    # Upload do Cloudinary
    try:
        result = cloudinary.uploader.upload(
            file.file,
            resource_type="video",
            folder="rehabsense/exercises",
            public_id=f"exercise_{exercise_id}",
            overwrite=True,
        )
        video_url = result["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd uploadu do Cloudinary: {str(e)}")

    exercise.video_url = video_url
    db.commit()
    db.refresh(exercise)

    return {"message": "Filmik został dodany", "video_url": exercise.video_url}



def _delete_cloudinary_video(video_url: str):
    try:
        match = re.search(r'/upload/(?:v\d+/)?(.+?)\.[^.]+$', video_url)
        if match:
            public_id = match.group(1)
            cloudinary.uploader.destroy(public_id, resource_type="video")
    except Exception:
        pass  # Nie blokujemy jeśli usuwanie z chmury się nie uda
