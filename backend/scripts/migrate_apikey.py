import os
import sys

# Append backend to path so we can import db
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN api_key VARCHAR UNIQUE;"))
        conn.commit()
        print("Success: added api_key column")
except Exception as e:
    print("Error:", e)
