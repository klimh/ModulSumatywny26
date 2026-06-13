import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.database import Base
from db_models import (
    user, patient, physiotherapist, patient_physiotherapist, 
    exercise, rehab_plan, rehab_plan_exercise, session, 
    exercise_result, message, progress_note, certificate, 
    streak, pairing_request, badge
)

@pytest.fixture(name="db_session")
def fixture_db_session():
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def fixture_client(db_session):

    from fastapi.testclient import TestClient
    from main import app
    from db.database import get_db
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    
    # Przywracamy oryginalne zależności po zakończeniu testu
    app.dependency_overrides.pop(get_db, None)

