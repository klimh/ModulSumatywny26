from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"],deprecated="auto")

def get_password_hash(password: str) -> str:
    """zwraca si zahashowane haslo"""
    return pwd_context.hash(password)

def verify_password(tested_password: str, hashed_password: str) -> bool:
    """sprawdza, czy podane haslo pasuje do hasha z bazy"""
    return pwd_context.verify(tested_password,hashed_password)
