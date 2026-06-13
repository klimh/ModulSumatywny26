import pytest
from fastapi import status
from db_models.user import User
from db_models.physiotherapist import Physiotherapist

def test_user_register_and_login(client):

   # 1. Rejestracja użytkownika
    register_payload = {
        "first_name": "Anna",
        "last_name": "Nowak",
        "email": "anna.nowak@example.com",
        "password": "securepassword123"
    }
    response = client.post("/users/register", json=register_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "anna.nowak@example.com"
    assert data["role"] == "pacjent"

    # 2. Rejestracja z tym samym mailem (powinna zwrócić 400)
    response_dup = client.post("/users/register", json=register_payload)
    assert response_dup.status_code == 400
    assert "Ten email został już przypisany" in response_dup.json()["detail"]

    # 3. Logowanie
    login_payload = {
        "username": "anna.nowak@example.com",
        "password": "securepassword123"
    }
    response_login = client.post("/login", data=login_payload)
    assert response_login.status_code == 200
    token_data = response_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_pairing_flow_request(client, db_session):
    
    # 1. Tworzymy fizjoterapeutę w bazie i generujemy dla niego nagłówek uwierzytelniający
    from core.security import get_password_hash, create_access_token
    
    physio_user = User(
        first_name="Tomasz",
        last_name="Kowalski",
        email="tomasz.kowalski@example.com",
        password=get_password_hash("physiopassword"),
        role="fizjoterapeuta"
    )
    db_session.add(physio_user)
    db_session.flush()
    
    physio_profile = Physiotherapist(
        user_id=physio_user.user_id,
        specialization="Kardiologia",
        is_verified=True,
        is_available=True
    )
    db_session.add(physio_profile)
    db_session.commit()
    
    physio_token = create_access_token({"sub": physio_user.email, "role": "fizjoterapeuta", "user_id": physio_user.user_id})
    physio_headers = {"Authorization": f"Bearer {physio_token}"}
    
    # 2. Rejestrujemy pacjenta i logujemy go
    register_payload = {
        "first_name": "Jan",
        "last_name": "Pacjent",
        "email": "jan.pacjent@example.com",
        "password": "patientpassword"
    }
    client.post("/users/register", json=register_payload)
    
    login_response = client.post("/login", data={"username": "jan.pacjent@example.com", "password": "patientpassword"})
    patient_token = login_response.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    
    # 3. Pacjent wysyła prośbę o sparowanie (wymagany ortopeda lub kardiolog)
    pairing_payload = {
        "required_specialization": "Kardiologia",
        "problem_description": "Rehabilitacja po zawałowa"
    }
    pairing_response = client.post("/pairing/request", json=pairing_payload, headers=patient_headers)
    assert pairing_response.status_code == 200
    assert pairing_response.json()["message"] == "Zapytanie wysłane do fizjoterapeuty"
    assert pairing_response.json()["physio_id"] == physio_user.user_id
    
    # 4. Fizjoterapeuta pobiera listę oczekujących zapytań
    pending_response = client.get("/pairing/physio/pending", headers=physio_headers)
    assert pending_response.status_code == 200
    pending_data = pending_response.json()
    assert len(pending_data) == 1
    assert pending_data[0]["problem_description"] == "Rehabilitacja po zawałowa"
    assert "Jan Pacjent" in pending_data[0]["patient_name"]


def test_chat_between_paired_users(client, db_session):
    from core.security import get_password_hash, create_access_token
    from db_models.patient import Patient
    from db_models.patient_physiotherapist import PatientPhysiotherapist
    
    physio_user = User(first_name="Adam", last_name="Fizjo", email="adam.fizjo@example.com", password=get_password_hash("pass"), role="fizjoterapeuta")
    patient_user = User(first_name="Ewa", last_name="Pacjentka", email="ewa.pacjentka@example.com", password=get_password_hash("pass"), role="pacjent")
    db_session.add(physio_user)
    db_session.add(patient_user)
    db_session.flush()
    
    physio = Physiotherapist(user_id=physio_user.user_id, specialization="Ortopedia", is_verified=True, is_available=True)
    patient = Patient(user_id=patient_user.user_id)
    db_session.add(physio)
    db_session.add(patient)
    db_session.flush()
    
    # 2. Tworzymy zaakceptowaną relację parowania
    relation = PatientPhysiotherapist(patient_id=patient_user.user_id, physio_id=physio_user.user_id, status="ZAAKCEPTOWANE")
    db_session.add(relation)
    db_session.commit()
    
    # Nagłówki uwierzytelniania
    patient_token = create_access_token({"sub": patient_user.email, "role": "pacjent", "user_id": patient_user.user_id})
    physio_token = create_access_token({"sub": physio_user.email, "role": "fizjoterapeuta", "user_id": physio_user.user_id})
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    physio_headers = {"Authorization": f"Bearer {physio_token}"}
    
    # 3. Pacjent wysyła wiadomość do fizjoterapeuty
    msg_payload = {"receiver_id": physio_user.user_id, "content": "Cześć, dzisiaj bez bólu!"}
    send_resp = client.post("/chat/", json=msg_payload, headers=patient_headers)
    assert send_resp.status_code == 200
    assert send_resp.json()["content"] == "Cześć, dzisiaj bez bólu!"
    
    # 4. Fizjoterapeuta sprawdza nieprzeczytane wiadomości
    unread_resp = client.get("/chat/status/unread-count", headers=physio_headers)
    assert unread_resp.status_code == 200
    assert unread_resp.json()["unread_count"] == 1
    
    # 5. Fizjoterapeuta pobiera historię wiadomości (powinno oznaczyć jako przeczytane)
    history_resp = client.get(f"/chat/{patient_user.user_id}", headers=physio_headers)
    assert history_resp.status_code == 200
    assert len(history_resp.json()) == 1
    assert history_resp.json()[0]["content"] == "Cześć, dzisiaj bez bólu!"
    
    # Po pobraniu historii nieprzeczytane wiadomości powinny wynosić 0
    unread_resp_after = client.get("/chat/status/unread-count", headers=physio_headers)
    assert unread_resp_after.json()["unread_count"] == 0


def test_chat_forbidden_for_unpaired_users(client, db_session):
    from core.security import get_password_hash, create_access_token
    
    physio_user = User(first_name="Piotr", last_name="Fizjo", email="piotr.fizjo@example.com", password=get_password_hash("pass"), role="fizjoterapeuta")
    patient_user = User(first_name="Kamil", last_name="Pacjent", email="kamil.pacjent@example.com", password=get_password_hash("pass"), role="pacjent")
    db_session.add(physio_user)
    db_session.add(patient_user)
    db_session.commit()
    
    patient_token = create_access_token({"sub": patient_user.email, "role": "pacjent", "user_id": patient_user.user_id})
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Próba wysłania wiadomości (powinna zwrócić 403 Forbidden)
    msg_payload = {"receiver_id": physio_user.user_id, "content": "Wiadomość zabroniona"}
    send_resp = client.post("/chat/", json=msg_payload, headers=patient_headers)
    assert send_resp.status_code == 403
    assert "Cannot send message" in send_resp.json()["detail"]


def test_streaks_api_endpoints_and_admin_jobs(client, db_session):
    
    from core.security import get_password_hash, create_access_token
    from db_models.patient import Patient
    
    # 1. Tworzymy pacjenta i admina
    patient_user = User(first_name="Ola", last_name="Kowalska", email="ola.k@example.com", password=get_password_hash("pass"), role="pacjent")
    admin_user = User(first_name="Admin", last_name="Admin", email="admin.test@example.com", password=get_password_hash("pass"), role="admin")
    db_session.add(patient_user)
    db_session.add(admin_user)
    db_session.flush()
    
    patient = Patient(user_id=patient_user.user_id, streak_count=3)
    db_session.add(patient)
    db_session.commit()
    
    patient_token = create_access_token({"sub": patient_user.email, "role": "pacjent", "user_id": patient_user.user_id})
    admin_token = create_access_token({"sub": admin_user.email, "role": "admin", "user_id": admin_user.user_id})
    
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Pacjent pobiera swoje podsumowanie passy
    summary_resp = client.get("/streaks/me", headers=patient_headers)
    assert summary_resp.status_code == 200
    assert summary_resp.json()["current_streak"] == 3
    
    # 3. Pacjent próbuje wywołać midnight-check (powinno być 403 Forbidden - brak roli admina)
    job_resp = client.post("/streaks/jobs/midnight-check", headers=patient_headers)
    assert job_resp.status_code == 403
    
    # 4. Admin wywołuje midnight-check (powinno być 200 OK)
    job_resp_admin = client.post("/streaks/jobs/midnight-check", headers=admin_headers)
    assert job_resp_admin.status_code == 200
    assert "reset_count" in job_resp_admin.json()

