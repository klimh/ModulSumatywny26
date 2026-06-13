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
