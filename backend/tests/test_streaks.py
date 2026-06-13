import pytest
from datetime import date, timedelta
from db_models.user import User
from db_models.patient import Patient
from db_models.streak import Streak
from core.streaks import get_or_create_streak, record_activity

@pytest.fixture
def test_patient(db_session):
    """Fixture tworzący użytkownika oraz profil pacjenta w testowej bazie danych."""
    u = User(
        first_name="Jan",
        last_name="Kowalski",
        email="jan.kowalski@example.com",
        password="test_hashed_password",
        role="pacjent"
    )
    db_session.add(u)
    db_session.commit()
    p = Patient(
        user_id=u.user_id,
        streak_count=0
    )
    db_session.add(p)
    db_session.commit()
    return p


def test_get_or_create_streak_new_patient(db_session, test_patient):
   
    
    initial_streak = db_session.query(Streak).filter(Streak.patient_id == test_patient.user_id).first()
    assert initial_streak is None
    streak = get_or_create_streak(db_session, test_patient.user_id)
    
    # Weryfikacja poprawności danych w zwróconym obiekcie
    assert streak is not None
    assert streak.patient_id == test_patient.user_id
    assert streak.current_streak == 0
    assert streak.longest_streak == 0
    assert streak.last_activity_date is None
    
    # Weryfikacja zapisu w bazie danych
    db_streak = db_session.query(Streak).filter(Streak.patient_id == test_patient.user_id).first()
    assert db_streak is not None
    assert db_streak.streak_id == streak.streak_id


def test_record_activity_consecutive_days(db_session, test_patient):
    # Dzień 1: Rejestrujemy pierwszą aktywność (np. wczoraj)
    day1 = date.today() - timedelta(days=1)
    streak = record_activity(db_session, test_patient.user_id, activity_date=day1)
    
    assert streak.current_streak == 1
    assert streak.longest_streak == 1
    assert streak.last_activity_date == day1
    
    # Dzień 2: Rejestrujemy aktywność dzisiaj (dzień po dniu)
    day2 = date.today()
    streak = record_activity(db_session, test_patient.user_id, activity_date=day2)
    
    assert streak.current_streak == 2
    assert streak.longest_streak == 2
    assert streak.last_activity_date == day2


def test_record_activity_same_day(db_session, test_patient):
    today = date.today()
    
    streak = record_activity(db_session, test_patient.user_id, activity_date=today)
    assert streak.current_streak == 1
    assert streak.longest_streak == 1
    
    streak = record_activity(db_session, test_patient.user_id, activity_date=today)
    assert streak.current_streak == 1
    assert streak.longest_streak == 1


def test_record_activity_after_gap(db_session, test_patient):
   
    day1 = date.today() - timedelta(days=3)
    streak = record_activity(db_session, test_patient.user_id, activity_date=day1)
    assert streak.current_streak == 1
    
    today = date.today()
    streak = record_activity(db_session, test_patient.user_id, activity_date=today)
    assert streak.current_streak == 1


def test_reset_expired_streaks_with_freeze_credits(db_session, test_patient):
   
    before_yesterday = date.today() - timedelta(days=2)
    streak = get_or_create_streak(db_session, test_patient.user_id)
    streak.current_streak = 5
    streak.longest_streak = 5
    streak.last_activity_date = before_yesterday
    streak.freeze_credits = 2
    db_session.commit()
    
   
    from core.streaks import reset_expired_streaks
    reset_count = reset_expired_streaks(db_session, checked_date=date.today())
    db_session.commit()
    
   
    assert reset_count == 0  # Żaden streak nie został zresetowany do 0
    assert streak.current_streak == 5
    assert streak.freeze_credits == 1


def test_record_activity_milestones(db_session, test_patient):
    """
    Test 6: Weryfikacja, czy record_activity generuje powiadomienie o kamieniu milowym
    (np. 7 dni passy) oraz standardowe gratulacje.
    """
    from db_models.streak import AppNotification
    
    # Ustawiamy passę na 6 dni i ostatnią aktywność na wczoraj
    streak = get_or_create_streak(db_session, test_patient.user_id)
    streak.current_streak = 6
    streak.longest_streak = 6
    streak.last_activity_date = date.today() - timedelta(days=1)
    db_session.commit()
    
    # Rejestrujemy dzisiejszą aktywność -> passa rośnie do 7 (kamień milowy)
    record_activity(db_session, test_patient.user_id, activity_date=date.today())
    db_session.commit()
    
    # Powinny zostać wysłane 2 powiadomienia: gratulacje ("streak_congrats") oraz kamień milowy ("streak_milestone")
    notifications = db_session.query(AppNotification).filter(AppNotification.user_id == test_patient.user_id).all()
    types = [n.notification_type for n in notifications]
    assert "streak_congrats" in types
    assert "streak_milestone" in types


def test_create_evening_reminders(db_session, test_patient):
    """
    Test 7: Weryfikacja, czy create_evening_reminders wysyła powiadomienie
    dla pacjentów z aktywnym planem, którzy dzisiaj nie wykonali treningu.
    """
    from db_models.physiotherapist import Physiotherapist
    from db_models.rehab_plan import RehabPlan
    from db_models.streak import AppNotification
    from core.streaks import create_evening_reminders
    
    # 1. Tworzymy fizjoterapeutę
    u_physio = User(
        first_name="Adam",
        last_name="Nowak",
        email="adam.nowak@example.com",
        password="test_hashed_password",
        role="fizjoterapeuta"
    )
    db_session.add(u_physio)
    db_session.commit()
    
    physio = Physiotherapist(user_id=u_physio.user_id, specialization="Ortopedia", is_verified=True, is_available=True)
    db_session.add(physio)
    db_session.commit()
    
    # 2. Tworzymy aktywny plan rehabilitacji dla pacjenta
    plan = RehabPlan(
        physio_id=physio.user_id,
        patient_id=test_patient.user_id,
        title="Plan kolano",
        is_active=True
    )
    db_session.add(plan)
    db_session.commit()
    
    # 3. Wywołujemy przypomnienia wieczorne
    sent = create_evening_reminders(db_session, reminder_date=date.today())
    db_session.commit()
    
    # Powinno wysłać jedno powiadomienie typu "streak_reminder"
    assert sent == 1
    notification = db_session.query(AppNotification).filter(
        AppNotification.user_id == test_patient.user_id,
        AppNotification.notification_type == "streak_reminder"
    ).first()
    assert notification is not None
    assert "Passa jest zagrozona" in notification.title
