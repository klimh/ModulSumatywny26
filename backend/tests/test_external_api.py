"""
Testy integracyjne API modułu Zewnętrznego (/external/v1) oraz generowania kluczy API.
Weryfikuje uwierzytelnianie przez X-API-Key, generowanie kluczy
oraz zachowanie systemu przy nieprawidłowych kluczach.
"""
import pytest
from core.security import get_password_hash, create_access_token
from db_models.user import User
from db_models.patient import Patient


@pytest.fixture
def api_key_env(client, db_session):
    """Tworzy pacjenta i generuje dla niego klucz API."""
    patient_user = User(
        first_name="Kasia", last_name="External",
        email="kasia.ext@asas.com",
        password=get_password_hash("pass"),
        role="pacjent"
    )
    db_session.add(patient_user)
    db_session.flush()

    patient = Patient(user_id=patient_user.user_id)
    db_session.add(patient)
    db_session.commit()

    patient_token = create_access_token({
        "sub": patient_user.email, "role": "pacjent", "user_id": patient_user.user_id
    })
    patient_headers = {"Authorization": f"Bearer {patient_token}"}

    # Generujemy klucz API
    gen_resp = client.post("/api-key/generate", headers=patient_headers)
    assert gen_resp.status_code == 200
    api_key = gen_resp.json()["api_key"]

    return {
        "patient_user": patient_user,
        "patient_headers": patient_headers,
        "api_key": api_key,
    }


def test_generate_api_key(api_key_env):
    """Generowanie klucza API powinno zwrócić klucz."""
    assert api_key_env["api_key"] is not None
    assert len(api_key_env["api_key"]) > 10


def test_get_api_key(client, api_key_env):
    """Pobranie klucza API powinno zwrócić ten sam klucz."""
    resp = client.get("/api-key", headers=api_key_env["patient_headers"])
    assert resp.status_code == 200
    assert resp.json()["api_key"] == api_key_env["api_key"]


def test_external_stats_with_valid_api_key(client, api_key_env):
    """Endpoint /external/v1/stats powinien zwracać dane przy prawidłowym kluczu API."""
    resp = client.get(
        "/external/v1/stats",
        headers={"X-API-Key": api_key_env["api_key"]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "patient_id" in data
    assert "status" in data


def test_external_stats_with_invalid_api_key(client):
    """Endpoint /external/v1/stats powinien zwrócić 401 przy nieprawidłowym kluczu API."""
    resp = client.get(
        "/external/v1/stats",
        headers={"X-API-Key": "totally-invalid-key-12345"}
    )
    assert resp.status_code == 401


def test_external_stats_without_api_key(client):
    """Endpoint /external/v1/stats powinien zwrócić 422/403 bez nagłówka X-API-Key."""
    resp = client.get("/external/v1/stats")
    # FastAPI zwraca 422 gdy brak wymaganego nagłówka (APIKeyHeader)
    assert resp.status_code in [401, 403, 422]
