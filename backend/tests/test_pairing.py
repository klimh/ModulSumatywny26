import pytest
from datetime import datetime, timedelta
from db_models.user import User
from db_models.physiotherapist import Physiotherapist
from db_models.patient import Patient
from db_models.pairing_request import PairingRequest
from schemas.pairing import PairingStatus
from core.pairing import find_available_physio, create_pairing_request
from core.pairing_tasks import check_and_reassign_expired_requests

@pytest.fixture
def physios(db_session):
    """Tworzy trzech fizjoterapeutów z różnymi obciążeniami i specjalizacjami."""
    users = []
    physio_profiles = []
    
    # Physio 1: Ortopeda, obciążony (będą do niego przypisane zapytania)
    u1 = User(first_name="Jan", last_name="Ortopeda", email="jan.orto@example.com", password="hash", role="fizjoterapeuta")
    db_session.add(u1)
    db_session.flush()
    p1 = Physiotherapist(user_id=u1.user_id, specialization="Ortopedia", is_verified=True, is_available=True)
    db_session.add(p1)
    
    # Physio 2: Ortopeda, wolny (brak zapytań)
    u2 = User(first_name="Adam", last_name="Ortopeda", email="adam.orto@example.com", password="hash", role="fizjoterapeuta")
    db_session.add(u2)
    db_session.flush()
    p2 = Physiotherapist(user_id=u2.user_id, specialization="Ortopedia", is_verified=True, is_available=True)
    db_session.add(p2)
    
    # Physio 3: Kardiolog, wolny (brak zapytań)
    u3 = User(first_name="Ewa", last_name="Kardio", email="ewa.kardio@example.com", password="hash", role="fizjoterapeuta")
    db_session.add(u3)
    db_session.flush()
    p3 = Physiotherapist(user_id=u3.user_id, specialization="Kardiologia", is_verified=True, is_available=True)
    db_session.add(p3)
    
    db_session.commit()
    return p1, p2, p3


@pytest.fixture
def patient(db_session):
    u = User(first_name="Marek", last_name="Pacjent", email="marek.pac@example.com", password="hash", role="pacjent")
    db_session.add(u)
    db_session.flush()
    p = Patient(user_id=u.user_id)
    db_session.add(p)
    db_session.commit()
    return p


def test_find_available_physio_least_load(db_session, physios, patient):
    """
    Test 8: Wyszukiwanie fizjoterapeuty z najmniejszym obciążeniem (najmniejsza liczba PENDING).
    """
    p1, p2, p3 = physios
    
    # Tworzymy oczekujące zapytanie przypisane do p1 (obciążony ortopeda)
    create_pairing_request(db_session, patient_id=patient.user_id, physio_id=p1.user_id, problem="Ból barku")
    
    # Szukamy ortopedy: powinien wybrać wolnego (p2), a nie p1
    chosen = find_available_physio(db_session, specialization="Ortopedia")
    assert chosen is not None
    assert chosen.user_id == p2.user_id


def test_check_and_reassign_expired_requests(db_session, physios, patient):
    """
    Test 9: Automatyczne przenoszenie wygasłych zapytań (np. po 24h bez reakcji)
    lub odrzuconych do nowego wolnego fizjoterapeuty.
    """
    p1, p2, p3 = physios
    
    # Tworzymy zapytanie do p1, które wygasło (updated_at przed 24h)
    req = PairingRequest(
        patient_id=patient.user_id,
        physio_id=p1.user_id,
        problem_description="Ból kolana",
        status=PairingStatus.PENDING,
        updated_at=datetime.utcnow() - timedelta(hours=25)
    )
    db_session.add(req)
    db_session.commit()
    
    # Wywołujemy scheduler do przepisywania wygasłych zapytań
    check_and_reassign_expired_requests(db_session, expiration_hours=24)
    
    # Stare zapytanie powinno mieć status EXPIRED
    db_session.refresh(req)
    assert req.status == PairingStatus.EXPIRED
    
    # Powinno powstać nowe zapytanie do wolnego ortopedy (p2 lub p3 - z racji braku specjalizacji w reassign wybiera dowolnego wolnego)
    new_reqs = db_session.query(PairingRequest).filter(
        PairingRequest.patient_id == patient.user_id,
        PairingRequest.status == PairingStatus.PENDING
    ).all()
    
    assert len(new_reqs) == 1
    assert new_reqs[0].physio_id in [p2.user_id, p3.user_id]
