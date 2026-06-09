from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func as sql_func
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from db.database import get_db
from core.security import RoleChecker
from db_models.user import User
from db_models.progress_note import ProgressNote
from db_models.session import Session
from db_models.exercise_result import ExerciseResult
from db_models.exercise import Exercise
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.rehab_plan import RehabPlan
from schemas.progress_note import ProgressNoteCreate, ProgressNoteResponse
from core.streaks import build_summary

router = APIRouter(
    prefix="/progress",
    tags=["Postępy"]
)

def _check_patient_access(current_user: User, patient_id: int, db: DBSession):
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

@router.post("/", response_model=ProgressNoteResponse)
def create_progress_note(
    note: ProgressNoteCreate,
    current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
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
    _check_patient_access(current_user, patient_id, db)
            
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
    _check_patient_access(current_user, patient_id, db)
            
    sessions = db.query(Session).filter(
        Session.patient_id == patient_id
    ).order_by(Session.session_id.desc()).all()
    
    result = []
    for session in sessions:
        session_results = []
        for r in session.results:
            ex = db.query(Exercise).filter(Exercise.exercise_id == r.exercise_id).first()
            session_results.append({
                "exercise_id": r.exercise_id,
                "exercise_name": ex.name if ex else "Unknown exercise",
                "reps_completed": r.reps_completed,
                "avg_accuracy": r.avg_accuracy,
                "max_rom": r.max_rom,
                "ai_feedback": r.ai_feedback
            })
        
        result.append({
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "results": session_results
        })
        
    return result

@router.get("/patient/{patient_id}/history")
def get_patient_progress_history(
    patient_id: int,
    exercise_id: Optional[int] = Query(None, description="Filtruj po ID ćwiczenia"),
    date_from: Optional[str] = Query(None, description="Data początkowa (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Data końcowa (YYYY-MM-DD)"),
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    _check_patient_access(current_user, patient_id, db)
    
    query = db.query(Session).filter(Session.patient_id == patient_id)

    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Session.created_at >= dt_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Session.created_at < dt_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")
    
    sessions = query.order_by(Session.created_at.asc()).all()
    
    result = []
    for session in sessions:
        session_results = []
        for r in session.results:
            if exercise_id is not None and r.exercise_id != exercise_id:
                continue
            ex = db.query(Exercise).filter(Exercise.exercise_id == r.exercise_id).first()
            session_results.append({
                "exercise_id": r.exercise_id,
                "exercise_name": ex.name if ex else "Unknown exercise",
                "reps_completed": r.reps_completed,
                "avg_accuracy": r.avg_accuracy,
                "max_rom": r.max_rom,
                "ai_feedback": r.ai_feedback
            })

        if exercise_id is not None and len(session_results) == 0:
            continue
        
        result.append({
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "results": session_results
        })
    
    return result

@router.get("/patient/{patient_id}/summary")
def get_patient_summary(
    patient_id: int,
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    return _build_patient_summary(patient_id, current_user, db)

@router.get("/me/summary")
def get_my_summary(
    current_user: User = Depends(RoleChecker(["pacjent"])),
    db: DBSession = Depends(get_db)
):
    return _build_patient_summary(current_user.user_id, current_user, db)

def _build_patient_summary(patient_id: int, current_user: User, db: DBSession):
    _check_patient_access(current_user, patient_id, db)
    
    now = datetime.now(timezone.utc)
    three_days_ago = now - timedelta(days=3)
    seven_days_ago = now - timedelta(days=7)

    last_session = db.query(Session).filter(
        Session.patient_id == patient_id
    ).order_by(Session.created_at.desc()).first()
    
    last_activity = last_session.created_at.isoformat() if last_session and last_session.created_at else None

    recent_sessions_count = db.query(sql_func.count(Session.session_id)).filter(
        Session.patient_id == patient_id,
        Session.created_at >= seven_days_ago
    ).scalar() or 0

    active_plan = db.query(RehabPlan).filter(
        RehabPlan.patient_id == patient_id,
        RehabPlan.is_active == True
    ).first()
    has_active_plan = active_plan is not None

    recent_sessions = db.query(Session).filter(
        Session.patient_id == patient_id
    ).order_by(Session.created_at.desc()).limit(6).all()
    
    accuracy_trend = None
    if len(recent_sessions) >= 2:
        recent_half = recent_sessions[:min(3, len(recent_sessions))]
        older_half = recent_sessions[min(3, len(recent_sessions)):]
        
        recent_accs = []
        for s in recent_half:
            for r in s.results:
                if r.avg_accuracy is not None:
                    recent_accs.append(r.avg_accuracy)
        
        older_accs = []
        for s in older_half:
            for r in s.results:
                if r.avg_accuracy is not None:
                    older_accs.append(r.avg_accuracy)
        
        if recent_accs and older_accs:
            recent_avg = sum(recent_accs) / len(recent_accs)
            older_avg = sum(older_accs) / len(older_accs)
            accuracy_trend = round(recent_avg - older_avg, 1)

    is_recently_active = last_session and last_session.created_at and last_session.created_at >= three_days_ago
    
    if not has_active_plan:
        status = "yellow"
    elif not is_recently_active:
        status = "red"
    elif accuracy_trend is not None and accuracy_trend < -5:
        status = "red"
    else:
        status = "green"

    total_sessions = db.query(sql_func.count(Session.session_id)).filter(
        Session.patient_id == patient_id
    ).scalar() or 0

    all_results = db.query(ExerciseResult).join(Session).filter(
        Session.patient_id == patient_id,
        ExerciseResult.avg_accuracy.isnot(None)
    ).all()
    
    overall_avg_accuracy = None
    if all_results:
        overall_avg_accuracy = round(sum(r.avg_accuracy for r in all_results) / len(all_results), 1)

    days_since_activity = None
    if last_session and last_session.created_at:
        try:
            days_since_activity = (now - last_session.created_at).days
        except TypeError:
            days_since_activity = (now.replace(tzinfo=None) - last_session.created_at.replace(tzinfo=None)).days
    
    return {
        "patient_id": patient_id,
        "status": status,
        "last_activity": last_activity,
        "days_since_activity": days_since_activity,
        "recent_sessions_count": recent_sessions_count,
        "total_sessions": total_sessions,
        "has_active_plan": has_active_plan,
        "accuracy_trend": accuracy_trend,
        "overall_avg_accuracy": overall_avg_accuracy,
        "streak": build_summary(db, patient_id)
    }
