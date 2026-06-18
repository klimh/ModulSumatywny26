"""
Testy integracyjne API modułu Postępów (/progress).
Weryfikuje izolację danych pacjentów, kontrolę dostępu fizjoterapeuty
oraz tworzenie notatek postępu.
"""
import pytest
from core.security import get_password_hash, create_access_token
from db_models.user import User
from db_models.patient import Patient
from db_models.physiotherapist import Physiotherapist
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.session import Session
from db_models.exercise import Exercise
from db_models.exercise_result import ExerciseResult
from db_models.rehab_plan import RehabPlan


@pytest.fixture
def progress_env(db_session):
    """Tworzy środowisko: 2 pacjentów, 1 fizjoterapeutę sparowanego z pacjentem A."""
    # Fizjoterapeuta
    physio_user = User(
        first_name="Adam", last_name="Fizjo",
        email="adam.progress@asas.com",
        password=get_password_hash("pass"),
        role="fizjoterapeuta"
    )
    # Pacjent A (sparowany z fizjoterapeutą)
    patient_a = User(
        first_name="Ola", last_name="Pacjent",
        email="ola.progress@asas.com",
        password=get_password_hash("pass"),
        role="pacjent"
    )
    # Pacjent B (NIE sparowany z fizjoterapeutą)
    patient_b = User(
        first_name="Kamil", last_name="Obcy",
        email="kamil.progress@asas.com",
        password=get_password_hash("pass"),
        role="pacjent"
    )

    db_session.add_all([physio_user, patient_a, patient_b])
    db_session.flush()

    physio = Physiotherapist(user_id=physio_user.user_id, specialization="Ortopedia",
                             is_verified=True, is_available=True)
    pat_a = Patient(user_id=patient_a.user_id)
    pat_b = Patient(user_id=patient_b.user_id)
    db_session.add_all([physio, pat_a, pat_b])
    db_session.flush()

    # Relacja: fizjoterapeuta sparowany z pacjentem A
    relation = PatientPhysiotherapist(
        patient_id=patient_a.user_id,
        physio_id=physio_user.user_id,
        status="ZAAKCEPTOWANE"
    )
    db_session.add(relation)
    db_session.commit()

    physio_token = create_access_token({
        "sub": physio_user.email, "role": "fizjoterapeuta", "user_id": physio_user.user_id
    })
    patient_a_token = create_access_token({
        "sub": patient_a.email, "role": "pacjent", "user_id": patient_a.user_id
    })
    patient_b_token = create_access_token({
        "sub": patient_b.email, "role": "pacjent", "user_id": patient_b.user_id
    })

    return {
        "physio_user": physio_user,
        "patient_a": patient_a,
        "patient_b": patient_b,
        "physio_headers": {"Authorization": f"Bearer {physio_token}"},
        "patient_a_headers": {"Authorization": f"Bearer {patient_a_token}"},
        "patient_b_headers": {"Authorization": f"Bearer {patient_b_token}"},
    }


# ───── Izolacja danych medycznych pacjentów ─────

def test_patient_cannot_access_other_patients_notes(client, db_session, progress_env):
    """Pacjent B nie powinien mieć dostępu do notatek pacjenta A (403)."""
    patient_a = progress_env["patient_a"]
    patient_b_headers = progress_env["patient_b_headers"]

    resp = client.get(
        f"/progress/patient/{patient_a.user_id}/notes",
        headers=patient_b_headers
    )
    assert resp.status_code == 403


def test_patient_cannot_access_other_patients_sessions(client, db_session, progress_env):
    """Pacjent B nie powinien mieć dostępu do sesji pacjenta A (403)."""
    patient_a = progress_env["patient_a"]
    patient_b_headers = progress_env["patient_b_headers"]

    resp = client.get(
        f"/progress/patient/{patient_a.user_id}/sessions",
        headers=patient_b_headers
    )
    assert resp.status_code == 403


def test_patient_cannot_access_other_patients_summary(client, db_session, progress_env):
    """Pacjent B nie powinien mieć dostępu do podsumowania pacjenta A (403)."""
    patient_a = progress_env["patient_a"]
    patient_b_headers = progress_env["patient_b_headers"]

    resp = client.get(
        f"/progress/patient/{patient_a.user_id}/summary",
        headers=patient_b_headers
    )
    assert resp.status_code == 403

def test_physio_can_access_paired_patient_notes(client, db_session, progress_env):
    """Fizjoterapeuta powinien mieć dostęp do notatek swojego sparowanego pacjenta."""
    patient_a = progress_env["patient_a"]
    physio_headers = progress_env["physio_headers"]

    resp = client.get(
        f"/progress/patient/{patient_a.user_id}/notes",
        headers=physio_headers
    )
    assert resp.status_code == 200


def test_physio_cannot_access_unpaired_patient_notes(client, db_session, progress_env):
    """Fizjoterapeuta nie powinien mieć dostępu do notatek niesparowanego pacjenta (403)."""
    patient_b = progress_env["patient_b"]
    physio_headers = progress_env["physio_headers"]

    resp = client.get(
        f"/progress/patient/{patient_b.user_id}/notes",
        headers=physio_headers
    )
    assert resp.status_code == 403

def test_physio_can_create_progress_note(client, db_session, progress_env):
    """Fizjoterapeuta powinien móc dodać notatkę postępu dla sparowanego pacjenta."""
    patient_a = progress_env["patient_a"]
    physio_headers = progress_env["physio_headers"]

    note_payload = {
        "patient_id": patient_a.user_id,
        "note_content": "Pacjentka wykazuje znaczną poprawę mobilności kolana.",
        "pain_level": 3,
        "mobility_level": 7
    }
    resp = client.post("/progress/", json=note_payload, headers=physio_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["note_content"] == note_payload["note_content"]
    assert data["pain_level"] == 3
    assert data["mobility_level"] == 7


def test_physio_cannot_create_note_for_unpaired_patient(client, db_session, progress_env):
    """Fizjoterapeuta nie powinien móc dodać notatki dla niesparowanego pacjenta (403)."""
    patient_b = progress_env["patient_b"]
    physio_headers = progress_env["physio_headers"]

    note_payload = {
        "patient_id": patient_b.user_id,
        "note_content": "Próba nieuprawnionej notatki.",
        "pain_level": 5,
        "mobility_level": 5
    }
    resp = client.post("/progress/", json=note_payload, headers=physio_headers)
    assert resp.status_code == 403


def test_patient_summary_status_no_plan(client, db_session, progress_env):
    """Pacjent bez aktywnego planu powinien mieć status 'yellow'."""
    patient_a_headers = progress_env["patient_a_headers"]

    resp = client.get("/progress/me/summary", headers=patient_a_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "yellow"
    assert data["has_active_plan"] is False


def test_patient_summary_with_active_plan(client, db_session, progress_env):
    """Pacjent z aktywnym planem i brakiem ostatniej aktywności powinien mieć status 'red'."""
    patient_a = progress_env["patient_a"]
    physio_user = progress_env["physio_user"]
    patient_a_headers = progress_env["patient_a_headers"]

    plan = RehabPlan(
        physio_id=physio_user.user_id,
        patient_id=patient_a.user_id,
        title="Plan kolano",
        is_active=True
    )
    db_session.add(plan)
    db_session.commit()

    resp = client.get("/progress/me/summary", headers=patient_a_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_active_plan"] is True
    assert data["status"] == "red"
