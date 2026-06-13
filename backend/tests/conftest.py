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
   
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
