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
