from calendar import monthrange
from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from db_models.message import Message
from db_models.patient import Patient
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.rehab_plan import RehabPlan
from db_models.session import Session as TrainingSession
from db_models.streak import AppNotification, Streak, StreakHistory


MILESTONES = {7, 30, 50, 100}


def get_or_create_streak(db: Session, patient_id: int) -> Streak:
    streak = db.query(Streak).filter(Streak.patient_id == patient_id).first()
    if streak:
        return streak

    patient = db.query(Patient).filter(Patient.user_id == patient_id).first()
    initial = patient.streak_count if patient and patient.streak_count else 0
    streak = Streak(patient_id=patient_id, current_streak=initial, longest_streak=initial)
    db.add(streak)
    db.flush()
    return streak


def record_activity(db: Session, patient_id: int, activity_date: date | None = None) -> Streak:
    activity_date = activity_date or date.today()
    streak = get_or_create_streak(db, patient_id)

    if streak.last_activity_date == activity_date:
        current = streak.current_streak
    elif streak.last_activity_date == activity_date - timedelta(days=1):
        current = streak.current_streak + 1
    else:
        current = 1

    streak.current_streak = current
    streak.longest_streak = max(streak.longest_streak or 0, current)
    streak.last_activity_date = activity_date

    history = db.query(StreakHistory).filter(
        StreakHistory.patient_id == patient_id,
        StreakHistory.activity_date == activity_date,
    ).first()
    if not history:
        history = StreakHistory(patient_id=patient_id, activity_date=activity_date)
        db.add(history)

    history.status = "completed"
    history.sessions_count = (history.sessions_count or 0) + 1
    history.streak_value = current
    history.has_assigned_tasks = True

    patient = db.query(Patient).filter(Patient.user_id == patient_id).first()
    if patient:
        patient.streak_count = current
        patient.last_activity = activity_date

    _create_patient_streak_notifications(db, patient_id, current)
    return streak


def reset_expired_streaks(db: Session, checked_date: date | None = None) -> int:
    checked_date = checked_date or date.today()
    yesterday = checked_date - timedelta(days=1)
    reset_count = 0

    active_streaks = db.query(Streak).filter(Streak.current_streak > 0).all()
    for streak in active_streaks:
        if not streak.last_activity_date or streak.last_activity_date < yesterday:
            if streak.freeze_credits > 0:
                streak.freeze_credits -= 1
                _mark_missed_day(db, streak.patient_id, yesterday, "frozen", streak.current_streak)
                continue

            previous = streak.current_streak
            streak.current_streak = 0
            _mark_missed_day(db, streak.patient_id, yesterday, "missed", 0)
            patient = db.query(Patient).filter(Patient.user_id == streak.patient_id).first()
            if patient:
                patient.streak_count = 0
            _notify_physio_about_broken_streak(db, streak.patient_id, previous)
            reset_count += 1

    return reset_count


def create_evening_reminders(db: Session, reminder_date: date | None = None) -> int:
    reminder_date = reminder_date or date.today()
    active_patients = db.query(RehabPlan.patient_id).filter(RehabPlan.is_active == True).distinct().all()
    sent = 0

    for row in active_patients:
        patient_id = row[0]
        history = db.query(StreakHistory).filter(
            StreakHistory.patient_id == patient_id,
            StreakHistory.activity_date == reminder_date,
            StreakHistory.status == "completed",
        ).first()
        if history:
            continue

        existing = db.query(AppNotification).filter(
            AppNotification.user_id == patient_id,
            AppNotification.notification_type == "streak_reminder",
            AppNotification.created_at >= datetime.combine(reminder_date, time.min),
        ).first()
        if existing:
            continue

        streak = get_or_create_streak(db, patient_id)
        _add_notification(
            db,
            patient_id,
            "streak_reminder",
            "Passa jest zagrozona",
            f"Twoja passa {streak.current_streak} dni jest zagrozona! Zrob dzisiejszy trening, aby jej nie stracic.",
        )
        sent += 1

    return sent


def build_calendar(db: Session, patient_id: int, year: int, month: int) -> dict:
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    today = date.today()

    rows = db.query(StreakHistory).filter(
        StreakHistory.patient_id == patient_id,
        StreakHistory.activity_date >= first_day,
        StreakHistory.activity_date <= last_day,
    ).all()
    by_day = {row.activity_date: row for row in rows}
    streak = get_or_create_streak(db, patient_id)

    days = []
    cursor = first_day
    while cursor <= last_day:
        row = by_day.get(cursor)
        has_tasks = _has_active_plan_on_day(db, patient_id)
        status = "no_tasks"
        sessions_count = 0
        streak_value = 0

        if row:
            status = row.status
            sessions_count = row.sessions_count
            streak_value = row.streak_value
            has_tasks = row.has_assigned_tasks
        elif cursor <= today and has_tasks:
            status = "missed"

        days.append({
            "date": cursor,
            "status": status,
            "sessions_count": sessions_count,
            "streak_value": streak_value,
            "has_assigned_tasks": has_tasks,
        })
        cursor += timedelta(days=1)

    active_days = sum(1 for day in days if day["status"] == "completed")
    return {
        "patient_id": patient_id,
        "year": year,
        "month": month,
        "active_days": active_days,
        "longest_streak": streak.longest_streak,
        "current_streak": streak.current_streak,
        "days": days,
    }


def build_summary(db: Session, patient_id: int) -> dict:
    today = date.today()
    streak = get_or_create_streak(db, patient_id)
    month_start = today.replace(day=1)
    active_days = db.query(StreakHistory).filter(
        StreakHistory.patient_id == patient_id,
        StreakHistory.activity_date >= month_start,
        StreakHistory.activity_date <= today,
        StreakHistory.status == "completed",
    ).count()

    completed_today = streak.last_activity_date == today
    return {
        "patient_id": patient_id,
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_activity_date": streak.last_activity_date,
        "active_days_this_month": active_days,
        "completed_today": completed_today,
        "is_at_risk_today": not completed_today and streak.current_streak > 0 and _has_active_plan_on_day(db, patient_id),
    }


def _mark_missed_day(db: Session, patient_id: int, activity_date: date, status: str, streak_value: int):
    history = db.query(StreakHistory).filter(
        StreakHistory.patient_id == patient_id,
        StreakHistory.activity_date == activity_date,
    ).first()
    if not history:
        history = StreakHistory(patient_id=patient_id, activity_date=activity_date)
        db.add(history)
    if history.status != "completed":
        history.status = status
        history.sessions_count = 0
        history.streak_value = streak_value
        history.has_assigned_tasks = True


def _has_active_plan_on_day(db: Session, patient_id: int) -> bool:
    return db.query(RehabPlan).filter(
        RehabPlan.patient_id == patient_id,
        RehabPlan.is_active == True,
    ).first() is not None


def _create_patient_streak_notifications(db: Session, patient_id: int, current_streak: int):
    _add_notification(
        db,
        patient_id,
        "streak_congrats",
        "Passa przedluzona",
        f"Swietnie! Twoja passa to juz {current_streak} dni!",
    )

    if current_streak in MILESTONES:
        _add_notification(
            db,
            patient_id,
            "streak_milestone",
            f"Kamien milowy: {current_streak} dni",
            f"Gratulacje! Osiagasz {current_streak} dni regularnych cwiczen.",
        )


def _notify_physio_about_broken_streak(db: Session, patient_id: int, previous_streak: int):
    relations = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.patient_id == patient_id,
        PatientPhysiotherapist.status == "ZAAKCEPTOWANE",
    ).all()
    for relation in relations:
        _add_notification(
            db,
            relation.physio_id,
            "patient_streak_broken",
            "Passa pacjenta przerwana",
            f"Pacjent przerwal passe {previous_streak} dni i moze potrzebowac kontaktu.",
            related_patient_id=patient_id,
        )
        db.add(Message(
            sender_id=patient_id,
            receiver_id=relation.physio_id,
            content=f"[SYSTEM:STREAK_BROKEN:{patient_id}:{previous_streak}]",
        ))


def _add_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    body: str,
    related_patient_id: int | None = None,
):
    db.add(AppNotification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        related_patient_id=related_patient_id,
    ))
