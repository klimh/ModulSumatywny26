import re
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from db.database import get_db
from core.security import RoleChecker
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.user import User
from typing import List
from db_models.exercise import Exercise
from db_models.rehab_plan import RehabPlan
from db_models.rehab_plan_exercise import RehabPlanExercise
from db_models.message import Message
from db_models.certificate import Certificate
from schemas.exercise import ExerciseCreate, ExerciseResponse
from schemas.rehab_plan import RehabPlanCreate, RehabPlanResponse
from schemas.certificate import CertificateResponse

router = APIRouter(
    prefix="/physio",
    tags=["Fizjoterapeuta"]
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
def add_exercise(
        exercise: ExerciseCreate,
        current_user: User = Depends(RoleChecker(["fizjoterapeuta", "admin"])),
        db: Session = Depends(get_db)
):
    """Dodaje nowe ćwiczenie. Dla admina globalne, dla fizjoterapeuty prywatne."""
    exercise_data = exercise.model_dump()
    if current_user.role == "fizjoterapeuta":
        exercise_data["author_id"] = current_user.user_id
    else:
        exercise_data["author_id"] = None
        
    new_exercise = Exercise(**exercise_data)
    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)
    return new_exercise


@router.get("/exercises", response_model=List[ExerciseResponse])
def get_all_exercises(
        current_user: User = Depends(RoleChecker(["fizjoterapeuta", "admin"])),
        db: Session = Depends(get_db)
):
    """Pobiera listę ćwiczeń (dla admina: globalne, dla physio: globalne + własne)"""
    if current_user.role == "admin":
        return db.query(Exercise).filter(Exercise.author_id == None).all()
    
    return db.query(Exercise).filter(
        (Exercise.author_id == None) | (Exercise.author_id == current_user.user_id)
    ).all()



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
    
    system_msg = Message(
        sender_id=current_user.user_id,
        receiver_id=plan_data.patient_id,
        content="[SYSTEM:PLAN_UPDATE]"
    )
    db.add(system_msg)
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
        current_user: User = Depends(RoleChecker(["fizjoterapeuta", "admin"])),
        db: Session = Depends(get_db)
):
    """Dodaje filmik instruktażowy do ćwiczenia (upload do Cloudinary)"""
    exercise = db.query(Exercise).filter(Exercise.exercise_id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Ćwiczenie nie istnieje")
        
    if current_user.role == "fizjoterapeuta" and exercise.author_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Brak uprawnień. Nie możesz edytować ćwiczeń globalnych.")

    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nieobsługiwany format wideo. Dozwolone: MP4, WebM, MOV, AVI")

    if exercise.video_url:
        _delete_cloudinary_video(exercise.video_url)

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


@router.delete("/exercises/{exercise_id}/video")
def delete_exercise_video(
        exercise_id: int,
        current_user: User = Depends(RoleChecker(["fizjoterapeuta", "admin"])),
        db: Session = Depends(get_db)
):
    """Usuwa wideo z ćwiczenia"""
    exercise = db.query(Exercise).filter(Exercise.exercise_id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Ćwiczenie nie istnieje")
        
    if current_user.role == "fizjoterapeuta" and exercise.author_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Brak uprawnień. Nie możesz usuwać wideo z ćwiczeń globalnych.")
        
    if exercise.video_url:
        _delete_cloudinary_video(exercise.video_url)
        exercise.video_url = None
        db.commit()
        db.refresh(exercise)
        
    return {"message": "Wideo usunięte"}


@router.post("/certificates/upload", response_model=CertificateResponse)
def upload_certificate(
        name: str = Form(...),
        file: UploadFile = File(...),
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    """Dodaje nowy certyfikat dla zalogowanego fizjoterapeuty"""
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nieobsługiwany format pliku. Dozwolone: JPG, PNG, PDF")

    try:
        resource_type = "image" if file.content_type in ["image/jpeg", "image/png"] else "raw"
        result = cloudinary.uploader.upload(
            file.file,
            resource_type=resource_type,
            folder="rehabsense/certificates",
        )
        file_url = result["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd uploadu do Cloudinary: {str(e)}")

    new_cert = Certificate(
        physio_id=current_user.user_id,
        name=name,
        file_url=file_url,
        is_verified=False
    )
    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)

    return new_cert


@router.get("/certificates", response_model=List[CertificateResponse])
def get_my_certificates(
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    """Pobiera listę certyfikatów fizjoterapeuty"""
    return db.query(Certificate).filter(Certificate.physio_id == current_user.user_id).all()


@router.delete("/certificates/{certificate_id}")
def delete_certificate(
        certificate_id: int,
        current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
        db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(
        Certificate.certificate_id == certificate_id,
        Certificate.physio_id == current_user.user_id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certyfikat nie znaleziony")

    # Optionally delete from cloudinary
    # if "image" in cert.file_url:
    #     _delete_cloudinary_video(cert.file_url) # _delete_cloudinary_video uses resource_type="video", so maybe not this exact method

    db.delete(cert)
    db.commit()
    return {"message": "Certyfikat usunięty"}


def _delete_cloudinary_video(video_url: str):
    try:
        match = re.search(r'/upload/(?:v\d+/)?(.+?)\.[^.]+$', video_url)
        if match:
            public_id = match.group(1)
            cloudinary.uploader.destroy(public_id, resource_type="video")
    except Exception:
        pass
