import pytest
from fastapi import HTTPException
from db_models.user import User
from core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    RoleChecker
)

def test_password_hashing():
    """
    Test 10: Weryfikacja poprawności hashowania hasła oraz jego sprawdzania.
    """
    password = "SuperSecretPassword123"
    hashed = get_password_hash(password)
    
    # Hasło nie powinno być zapisane jawnym tekstem
    assert hashed != password
    
    # Weryfikacja poprawnego hasła
    assert verify_password(password, hashed) is True
    
    # Weryfikacja błędnego hasła
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_generation_and_decoding():
    """
    Test 11: Generowanie tokenu JWT i dekodowanie danych (sub).
    """
    import jwt
    from core.security import SECRET_KEY, ALGORITHM
    
    data = {"sub": "jan.kowalski@example.com", "role": "pacjent"}
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    
    # Dekodowanie
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "jan.kowalski@example.com"
    assert decoded["role"] == "pacjent"
    assert "exp" in decoded  # Sprawdzamy obecność daty wygaśnięcia


def test_role_checker_dependency():
    """
    Test 12: Weryfikacja działania dekoratora RoleChecker dla różnych ról.
    """
    checker = RoleChecker(["fizjoterapeuta", "admin"])
    
    # Użytkownik z poprawną rolą powinien zostać przepuszczony
    physio_user = User(first_name="Adam", last_name="Nowak", email="a@a.com", role="fizjoterapeuta")
    allowed_user = checker(physio_user)
    assert allowed_user == physio_user
    
    # Użytkownik z niepoprawną rolą powinien wywołać błąd 403 Forbidden
    patient_user = User(first_name="Jan", last_name="Kowalski", email="j@j.com", role="pacjent")
    with pytest.raises(HTTPException) as exc_info:
        checker(patient_user)
    
    assert exc_info.value.status_code == 403
    assert "Nie masz uprawnień" in exc_info.value.detail
