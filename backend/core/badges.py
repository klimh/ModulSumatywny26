from sqlalchemy.orm import Session
from db_models.badge import PatientBadge
from db_models.session import Session as DBSessionModel
from db_models.streak import Streak

def evaluate_and_award_badges(db: Session, patient_id: int, new_session_results: list, current_streak: int):
    """
    Sprawdza, czy pacjent zdobył nowe odznaki i dodaje je do bazy.
    Zwraca listę nowo przyznanych odznak w tej sesji.
    """
    # Pobierz wszystkie zdobyte dotąd odznaki tego pacjenta
    earned_badges_records = db.query(PatientBadge).filter(PatientBadge.patient_id == patient_id).all()
    earned_badge_types = {b.badge_type for b in earned_badges_records}

    new_badges = []

    def award(badge_type: str):
        if badge_type not in earned_badge_types:
            new_badge = PatientBadge(patient_id=patient_id, badge_type=badge_type)
            db.add(new_badge)
            new_badges.append(badge_type)
            earned_badge_types.add(badge_type)

    # 1. Sprawdzenie liczby sesji
    total_sessions = db.query(DBSessionModel).filter(DBSessionModel.patient_id == patient_id).count()
    if total_sessions >= 1:
        award('FIRST_SESSION')
    if total_sessions >= 10:
        award('SESSIONS_10')

    # 2. Sprawdzenie precyzji w nowej sesji
    if new_session_results:
        avg_accuracy = sum(res.get("accuracy", 0) for res in new_session_results) / len(new_session_results)
        if avg_accuracy >= 90:
            award('ACCURACY_90')

    # 3. Sprawdzenie passy
    if current_streak >= 3:
        award('STREAK_3')
    if current_streak >= 7:
        award('STREAK_7')

    if new_badges:
        db.commit()

    return new_badges
