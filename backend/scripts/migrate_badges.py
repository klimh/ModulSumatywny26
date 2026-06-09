import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from db.database import Base
from db_models.badge import PatientBadge
from db_models.user import User
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing")

engine = create_engine(DATABASE_URL)

print("Tworzenie tabeli patient_badges...")
Base.metadata.tables['patient_badges'].create(engine, checkfirst=True)
print("Sukces!")
