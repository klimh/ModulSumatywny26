"""
Testy integracyjne API modułu Administracyjnego (/admin).
Weryfikuje tworzenie, listowanie i usuwanie fizjoterapeutów
oraz zarządzanie certyfikatami przez admina.
"""
import pytest
from core.security import get_password_hash, create_access_token
from db_models.user import User
from db_models.physiotherapist import Physiotherapist
from db_models.certificate import Certificate


# ───── Fixture: nagłówki uwierzytelniające admina ─────

@pytest.fixture
def admin_headers(db_session):
    admin = User(
        first_name="Admin", last_name="Root",
        email="admin.root@example.com",
        password=get_password_hash("adminpass"),
        role="admin"
    )
    db_session.add(admin)
    db_session.commit()
    token = create_access_token({
        "sub": admin.email, "role": "admin", "user_id": admin.user_id
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def patient_headers(db_session):
    patient = User(
        first_name="Ewa", last_name="Pacjent",
        email="ewa.pac@example.com",
        password=get_password_hash("pass"),
        role="pacjent"
    )
    db_session.add(patient)
    db_session.commit()
    token = create_access_token({
        "sub": patient.email, "role": "pacjent", "user_id": patient.user_id
    })
    return {"Authorization": f"Bearer {token}"}


# ───── Testy ─────

def test_admin_create_physio(client, admin_headers):
    """Admin powinien móc stworzyć konto fizjoterapeuty."""
    payload = {
        "first_name": "Nowy",
        "last_name": "Fizjo",
        "email": "nowy.fizjo@example.com",
        "password": "fizjopass123",
        "specialization": "Ortopedia"
    }
    resp = client.post("/admin/create-physio", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "nowy.fizjo@example.com"
    assert data["role"] == "fizjoterapeuta"


def test_admin_create_physio_duplicate_email(client, admin_headers):
    """Próba utworzenia fizjoterapeuty z istniejącym emailem powinna zwrócić 400."""
    payload = {
        "first_name": "Jan",
        "last_name": "Fizjo",
        "email": "jan.fizjo.dup@example.com",
        "password": "pass123"
    }
    resp1 = client.post("/admin/create-physio", json=payload, headers=admin_headers)
    assert resp1.status_code == 200

    resp2 = client.post("/admin/create-physio", json=payload, headers=admin_headers)
    assert resp2.status_code == 400
    assert "email" in resp2.json()["detail"].lower()


def test_admin_list_physiotherapists(client, db_session, admin_headers):
    """Admin powinien móc pobrać listę fizjoterapeutów."""
    # Dodajemy fizjoterapeutę bezpośrednio w bazie
    u = User(first_name="Ada", last_name="Fizjo", email="ada.fizjo@example.com",
             password=get_password_hash("p"), role="fizjoterapeuta")
    db_session.add(u)
    db_session.flush()
    db_session.add(Physiotherapist(user_id=u.user_id, specialization="Kardiologia",
                                   is_verified=True, is_available=True))
    db_session.commit()

    resp = client.get("/admin/physiotherapists", headers=admin_headers)
    assert resp.status_code == 200
    emails = [p["email"] for p in resp.json()]
    assert "ada.fizjo@example.com" in emails


def test_admin_delete_physiotherapist(client, db_session, admin_headers):
    """Admin powinien móc usunąć konto fizjoterapeuty."""
    u = User(first_name="Del", last_name="Fizjo", email="del.fizjo@example.com",
             password=get_password_hash("p"), role="fizjoterapeuta")
    db_session.add(u)
    db_session.flush()
    db_session.add(Physiotherapist(user_id=u.user_id, is_verified=True, is_available=True))
    db_session.commit()

    resp = client.delete(f"/admin/physiotherapist/{u.user_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert "usunięty" in resp.json()["message"]

    # Potwierdzenie: użytkownik nie istnieje
    assert db_session.query(User).filter(User.user_id == u.user_id).first() is None


def test_admin_delete_nonexistent_physio(client, admin_headers):
    """Usunięcie nieistniejącego fizjoterapeuty powinno zwrócić 404."""
    resp = client.delete("/admin/physiotherapist/999999", headers=admin_headers)
    assert resp.status_code == 404


def test_admin_verify_certificate(client, db_session, admin_headers):
    """Admin powinien móc zatwierdzić certyfikat fizjoterapeuty."""
    u = User(first_name="Cert", last_name="Fizjo", email="cert.fizjo@example.com",
             password=get_password_hash("p"), role="fizjoterapeuta")
    db_session.add(u)
    db_session.flush()
    db_session.add(Physiotherapist(user_id=u.user_id, is_verified=True, is_available=True))
    cert = Certificate(physio_id=u.user_id, name="Certyfikat PNF",
                       file_url="https://example.com/cert.pdf", is_verified=False)
    db_session.add(cert)
    db_session.commit()

    resp = client.post(
        f"/admin/certificates/{cert.certificate_id}/verify?verify=true",
        headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["is_verified"] is True


def test_admin_endpoints_forbidden_for_patient(client, patient_headers):
    """Pacjent nie powinien mieć dostępu do endpointów admina (403)."""
    resp = client.get("/admin/physiotherapists", headers=patient_headers)
    assert resp.status_code == 403
