"""
Testy integracyjne API pełnego przepływu parowania (pairing flow).
Testuje cały cykl: wysłanie żądania → akceptacja przez fizjoterapeutę →
potwierdzenie przez pacjenta → powstanie relacji ZAAKCEPTOWANE.
Oraz scenariusze odrzucenia i duplikacji żądań.
"""
import pytest
from core.security import get_password_hash, create_access_token
from db_models.user import User
from db_models.patient import Patient
from db_models.physiotherapist import Physiotherapist
from db_models.patient_physiotherapist import PatientPhysiotherapist


@pytest.fixture
def paired_env(db_session):
    """Tworzy środowisko z pacjentem i fizjoterapeutą gotowymi do parowania."""
    physio_user = User(
        first_name="Tomasz", last_name="Fizjo",
        email="tomasz.flow@asas.com",
        password=get_password_hash("pass"),
        role="fizjoterapeuta"
    )
    patient_user = User(
        first_name="Anna", last_name="Pacjent",
        email="anna.flow@sasasa.com",
        password=get_password_hash("pass"),
        role="pacjent"
    )
    db_session.add(physio_user)
    db_session.add(patient_user)
    db_session.flush()

    physio = Physiotherapist(
        user_id=physio_user.user_id,
        specialization="Ortopedia",
        is_verified=True,
        is_available=True
    )
    patient = Patient(user_id=patient_user.user_id)
    db_session.add(physio)
    db_session.add(patient)
    db_session.commit()

    physio_token = create_access_token({
        "sub": physio_user.email, "role": "fizjoterapeuta", "user_id": physio_user.user_id
    })
    patient_token = create_access_token({
        "sub": patient_user.email, "role": "pacjent", "user_id": patient_user.user_id
    })

    return {
        "physio_user": physio_user,
        "patient_user": patient_user,
        "physio_headers": {"Authorization": f"Bearer {physio_token}"},
        "patient_headers": {"Authorization": f"Bearer {patient_token}"},
    }


def test_full_pairing_accept_flow(client, db_session, paired_env):
    """Test pełnego przepływu: żądanie akceptacja fizjo potwierdzenie pacjenta."""
    patient_headers = paired_env["patient_headers"]
    physio_headers = paired_env["physio_headers"]
    physio_user = paired_env["physio_user"]
    patient_user = paired_env["patient_user"]

    # 1. Pacjent wysyła żądanie parowania
    pairing_payload = {
        "required_specialization": "Ortopedia",
        "problem_description": "Ból barku po urazie"
    }
    resp = client.post("/pairing/request", json=pairing_payload, headers=patient_headers)
    assert resp.status_code == 200
    request_id = resp.json()["request_id"]

    # 2. Fizjoterapeuta akceptuje żądanie
    resp_accept = client.post(
        f"/pairing/{request_id}/physio-respond",
        json={"action": "accept"},
        headers=physio_headers
    )
    assert resp_accept.status_code == 200
    assert "zaakceptowane" in resp_accept.json()["message"].lower()

    # 3. Pacjent potwierdza sparowanie
    resp_confirm = client.post(
        f"/pairing/{request_id}/patient-confirm",
        headers=patient_headers
    )
    assert resp_confirm.status_code == 200
    assert "sukcesem" in resp_confirm.json()["message"].lower()

    # 4. Weryfikacja: relacja ZAAKCEPTOWANE istnieje w bazie danych
    connection = db_session.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.patient_id == patient_user.user_id,
        PatientPhysiotherapist.physio_id == physio_user.user_id,
        PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
    ).first()
    assert connection is not None


def test_pairing_reject_flow(client, db_session, paired_env):
    """Fizjoterapeuta odrzuca żądanie parowania."""
    patient_headers = paired_env["patient_headers"]
    physio_headers = paired_env["physio_headers"]

    pairing_payload = {
        "required_specialization": "Ortopedia",
        "problem_description": "Rehabilitacja kolana"
    }
    resp = client.post("/pairing/request", json=pairing_payload, headers=patient_headers)
    assert resp.status_code == 200
    request_id = resp.json()["request_id"]

    resp_reject = client.post(
        f"/pairing/{request_id}/physio-respond",
        json={"action": "reject"},
        headers=physio_headers
    )
    assert resp_reject.status_code == 200
    assert "odrzucone" in resp_reject.json()["message"].lower()


def test_patient_confirm_before_physio_accept_fails(client, db_session, paired_env):
    """Pacjent nie może potwierdzić sparowania, jeśli fizjoterapeuta jeszcze nie zaakceptował."""
    patient_headers = paired_env["patient_headers"]

    pairing_payload = {
        "required_specialization": "Ortopedia",
        "problem_description": "Ból nadgarstka"
    }
    resp = client.post("/pairing/request", json=pairing_payload, headers=patient_headers)
    assert resp.status_code == 200
    request_id = resp.json()["request_id"]

    resp_confirm = client.post(
        f"/pairing/{request_id}/patient-confirm",
        headers=patient_headers
    )
    assert resp_confirm.status_code == 400


def test_duplicate_pairing_request_blocked(client, db_session, paired_env):
    """Pacjent nie powinien móc wysłać drugiego żądania parowania, jeśli ma aktywne."""
    patient_headers = paired_env["patient_headers"]

    pairing_payload = {
        "required_specialization": "Ortopedia",
        "problem_description": "Pierwszy problem"
    }
    resp1 = client.post("/pairing/request", json=pairing_payload, headers=patient_headers)
    assert resp1.status_code == 200

    pairing_payload2 = {
        "required_specialization": "Ortopedia",
        "problem_description": "Drugi problem"
    }
    resp2 = client.post("/pairing/request", json=pairing_payload2, headers=patient_headers)
    assert resp2.status_code == 400
    assert "aktywne" in resp2.json()["detail"].lower()


def test_no_physio_available_returns_404(client, db_session, paired_env):
    """Brak dostępnych fizjoterapeutów o danej specjalizacji powinien zwrócić 404."""
    patient_headers = paired_env["patient_headers"]

    pairing_payload = {
        "required_specialization": "Neurologia",  
        "problem_description": "Problem neurologiczny"
    }
    resp = client.post("/pairing/request", json=pairing_payload, headers=patient_headers)
    assert resp.status_code == 404
    assert "Brak dostępnych" in resp.json()["detail"]
