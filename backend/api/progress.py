from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List

from db.database import get_db
from core.security import RoleChecker
from db_models.user import User
from db_models.progress_note import ProgressNote
from db_models.session import Session
from db_models.exercise_result import ExerciseResult
from db_models.exercise import Exercise
from db_models.patient_physiotherapist import PatientPhysiotherapist
from schemas.progress_note import ProgressNoteCreate, ProgressNoteResponse

router = APIRouter(
    prefix="/progress",
    tags=["Postępy"]
)

@router.post("/", response_model=ProgressNoteResponse)
def create_progress_note(
    note: ProgressNoteCreate,
    current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    """Fizjoterapeuta dodaje nową notatkę o postępach pacjenta"""
    # Sprawdz czy to pacjent tego fizjoterapeuty
    connection = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.patient_id == note.patient_id,
        PatientPhysiotherapist.physio_id == current_user.user_id,
        PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
    ).first()
    
    if not connection:
        raise HTTPException(status_code=403, detail="You do not have permission for this patient")
        
    db_note = ProgressNote(
        patient_id=note.patient_id,
        physio_id=current_user.user_id,
        note_content=note.note_content,
        pain_level=note.pain_level,
        mobility_level=note.mobility_level
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@router.get("/patient/{patient_id}/notes", response_model=List[ProgressNoteResponse])
def get_patient_notes(
    patient_id: int,
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    """Pobiera historię notatek z postępów dla danego pacjenta"""
    if current_user.role == "pacjent" and current_user.user_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if current_user.role == "fizjoterapeuta":
        connection = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.patient_id == patient_id,
            PatientPhysiotherapist.physio_id == current_user.user_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).first()
        if not connection:
            raise HTTPException(status_code=403, detail="Access denied to this patient")
            
    notes = db.query(ProgressNote).filter(
        ProgressNote.patient_id == patient_id
    ).order_by(ProgressNote.created_at.desc()).all()
    
    return notes

@router.get("/patient/{patient_id}/sessions")
def get_patient_sessions(
    patient_id: int,
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    """Pobiera historię sesji ćwiczeń pacjenta wraz ze statystykami"""
    if current_user.role == "pacjent" and current_user.user_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if current_user.role == "fizjoterapeuta":
        connection = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.patient_id == patient_id,
            PatientPhysiotherapist.physio_id == current_user.user_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).first()
        if not connection:
            raise HTTPException(status_code=403, detail="Access denied to this patient")
            
    sessions = db.query(Session).filter(
        Session.patient_id == patient_id
    ).order_by(Session.session_id.desc()).all()
    
    result = []
    for session in sessions:
        session_results = []
        for r in session.results:
            ex = db.query(Exercise).filter(Exercise.exercise_id == r.exercise_id).first()
            session_results.append({
                "exercise_name": ex.name if ex else "Unknown exercise",
                "reps_completed": r.reps_completed,
                "avg_accuracy": r.avg_accuracy,
                "ai_feedback": r.ai_feedback
            })
        
        result.append({
            "session_id": session.session_id,
            "title": session.title,
            # We don't have created_at on Session currently, but session_id is auto-increment
            "results": session_results
        })
        
    return result
