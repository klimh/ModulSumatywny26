"""
Testy integracyjne API modułu Fizjoterapeuty (/physio).
Weryfikuje tworzenie i pobieranie ćwiczeń, uprawnienia do edycji,
tworzenie planów rehabilitacji z walidacją wideo oraz zarządzanie pacjentami.
"""
import pytest
from core.security import get_password_hash, create_access_token
from db_models.user import User
from db_models.patient import Patient
from db_models.physiotherapist import Physiotherapist
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.exercise import Exercise


@pytest.fixture
def physio_env(db_session):
    """Tworzy środowisko: fizjoterapeutę, pacjenta ze sparowaną relacją i ćwiczenie."""
    physio_user = User(
        first_name="Jan", last_name="Fizjo",
        email="jan.physio.api@asas.com",
        password=get_password_hash("pass"),
        role="fizjoterapeuta"
    )
    patient_user = User(
        first_name="Maria", last_name="Pacjent",
        email="maria.physio.api@asas.com",
        password=get_password_hash("pass"),
        role="pacjent"
    )
    db_session.add_all([physio_user, patient_user])
    db_session.flush()

    physio = Physiotherapist(user_id=physio_user.user_id, specialization="Ortopedia",
                             is_verified=True, is_available=True)
    patient = Patient(user_id=patient_user.user_id)
    db_session.add_all([physio, patient])
    db_session.flush()

    relation = PatientPhysiotherapist(
        patient_id=patient_user.user_id,
        physio_id=physio_user.user_id,
        status="ZAAKCEPTOWANE"
    )
    db_session.add(relation)
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


# ───── Tworzenie i pobieranie ćwiczeń ─────

def test_physio_add_exercise(client, physio_env):
    """Fizjoterapeuta powinien móc dodać nowe ćwiczenie."""
    payload = {
        "name": "Przysiady",
        "description": "Ćwiczenie wzmacniające mięśnie nóg"
    }
    resp = client.post("/physio/exercises", json=payload, headers=physio_env["physio_headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Przysiady"
    assert data["author_id"] == physio_env["physio_user"].user_id


def test_physio_list_exercises_includes_own_and_global(client, db_session, physio_env):
    """Fizjoterapeuta widzi swoje ćwiczenia oraz globalne (author_id == None)."""
    physio_user = physio_env["physio_user"]

    # Ćwiczenie globalne
    global_ex = Exercise(name="Ćw. Globalne", description="Dostępne dla wszystkich",
                         author_id=None)
    # Ćwiczenie prywatne fizjoterapeuty
    private_ex = Exercise(name="Ćw. Prywatne", description="Tylko fizjoterapeuta",
                          author_id=physio_user.user_id)
    db_session.add_all([global_ex, private_ex])
    db_session.commit()

    resp = client.get("/physio/exercises", headers=physio_env["physio_headers"])
    assert resp.status_code == 200
    names = [e["name"] for e in resp.json()]
    assert "Ćw. Globalne" in names
    assert "Ćw. Prywatne" in names



def test_physio_create_plan_success(client, db_session, physio_env):
    """Fizjoterapeuta tworzy plan rehabilitacji z ćwiczeniem posiadającym wideo."""
    physio_user = physio_env["physio_user"]
    patient_user = physio_env["patient_user"]

    # Ćwiczenie z wideo
    exercise = Exercise(name="Skłony boczne", description="Rozciąganie",
                        video_url="https://example.com/video.mp4",
                        author_id=physio_user.user_id)
    db_session.add(exercise)
    db_session.commit()

    plan_payload = {
        "patient_id": patient_user.user_id,
        "title": "Plan rehabilitacji kręgosłupa",
        "exercise": [
            {"exercise_id": exercise.exercise_id, "reps_nr": 10, "sets_nr": 3}
        ]
    }
    resp = client.post("/physio/create-plan", json=plan_payload,
                       headers=physio_env["physio_headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Plan rehabilitacji kręgosłupa"
    assert data["is_active"] is True
    assert len(data["exercises"]) == 1
    assert data["exercises"][0]["name"] == "Skłony boczne"


def test_physio_create_plan_rejects_exercise_without_video(client, db_session, physio_env):
    """Tworzenie planu z ćwiczeniem BEZ wideo powinno zwrócić 400."""
    physio_user = physio_env["physio_user"]
    patient_user = physio_env["patient_user"]

    # Ćwiczenie BEZ wideo
    exercise = Exercise(name="Martwy ciąg", description="Siłowe",
                        video_url=None, author_id=physio_user.user_id)
    db_session.add(exercise)
    db_session.commit()

    plan_payload = {
        "patient_id": patient_user.user_id,
        "title": "Plan siłowy",
        "exercise": [
            {"exercise_id": exercise.exercise_id, "reps_nr": 5, "sets_nr": 5}
        ]
    }
    resp = client.post("/physio/create-plan", json=plan_payload,
                       headers=physio_env["physio_headers"])
    assert resp.status_code == 400
    assert "wideo" in resp.json()["detail"].lower()


def test_physio_my_patients(client, db_session, physio_env):
    """Fizjoterapeuta powinien widzieć listę swoich sparowanych pacjentów."""
    resp = client.get("/physio/my-patients", headers=physio_env["physio_headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    emails = [p["email"] for p in data]
    assert physio_env["patient_user"].email in emails


# ───── Kontrola ról ─────

def test_patient_cannot_add_exercise(client, physio_env):
    """Pacjent nie powinien mieć dostępu do endpointów fizjoterapeuty (403)."""
    payload = {
        "name": "Ćwiczenie nielegalne",
        "description": "Pacjent nie powinien tego dodać"
    }
    resp = client.post("/physio/exercises", json=payload,
                       headers=physio_env["patient_headers"])
    assert resp.status_code == 403
