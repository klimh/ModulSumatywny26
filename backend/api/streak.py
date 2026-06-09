from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.security import RoleChecker
from core.streaks import build_calendar, build_summary, create_evening_reminders, reset_expired_streaks
from db.database import get_db
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.streak import AppNotification
from db_models.user import User
from schemas.streak import AppNotificationResponse, StreakCalendar, StreakSummary

router = APIRouter(prefix="/streaks", tags=["Passy"])


def _check_patient_access(current_user: User, patient_id: int, db: Session):
    if current_user.role == "pacjent" and current_user.user_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "fizjoterapeuta":
        relation = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.patient_id == patient_id,
            PatientPhysiotherapist.physio_id == current_user.user_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE",
        ).first()
        if not relation:
            raise HTTPException(status_code=403, detail="Access denied to this patient")


@router.get("/me", response_model=StreakSummary)
def get_my_streak(
    current_user: User = Depends(RoleChecker(["pacjent"])),
    db: Session = Depends(get_db),
):
    return build_summary(db, current_user.user_id)


@router.get("/patient/{patient_id}", response_model=StreakSummary)
def get_patient_streak(
    patient_id: int,
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: Session = Depends(get_db),
):
    _check_patient_access(current_user, patient_id, db)
    return build_summary(db, patient_id)


@router.get("/patient/{patient_id}/calendar", response_model=StreakCalendar)
def get_patient_streak_calendar(
    patient_id: int,
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: Session = Depends(get_db),
):
    _check_patient_access(current_user, patient_id, db)
    return build_calendar(db, patient_id, year, month)


@router.get("/notifications", response_model=list[AppNotificationResponse])
def get_notifications(
    current_user: User = Depends(RoleChecker(["pacjent", "fizjoterapeuta"])),
    db: Session = Depends(get_db),
):
    return db.query(AppNotification).filter(
        AppNotification.user_id == current_user.user_id,
    ).order_by(AppNotification.created_at.desc()).limit(20).all()


@router.post("/jobs/midnight-check")
def run_midnight_check(
    checked_date: date | None = None,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db),
):
    reset_count = reset_expired_streaks(db, checked_date)
    db.commit()
    return {"reset_count": reset_count}


@router.post("/jobs/evening-reminders")
def run_evening_reminders(
    reminder_date: date | None = None,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db),
):
    sent_count = create_evening_reminders(db, reminder_date)
    db.commit()
    return {"sent_count": sent_count}
