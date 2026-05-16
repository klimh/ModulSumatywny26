import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, Base, SessionLocal
import cloudinary

from db_models import user, patient, physiotherapist, patient_physiotherapist, exercise, rehab_plan, rehab_plan_exercise, session, exercise_result, message
from api import user as user_api
from api import auth as auth_api
from api import physio as physio_api
from api import patient as patient_api
from api import ai as ai_api
from api import admin as admin_api
from api import chat as chat_api

Base.metadata.create_all(bind=engine)
app = FastAPI(title = "RehabSense API", version = "1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CLODINARY
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

app.include_router(auth_api.router)
app.include_router(user_api.router)

app.include_router(physio_api.router)

app.include_router(patient_api.router)

app.include_router(ai_api.router)

app.include_router(admin_api.router)

app.include_router(chat_api.router)


@app.on_event("startup")
def seed_admin():
    """Tworzy konto admina jeśli nie istnieje"""
    from db_models.user import User
    from core.security import get_password_hash

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin").first()
        if not admin:
            admin_user = User(
                first_name="Admin",
                last_name="Admin",
                email="admin",
                password=get_password_hash("admin"),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created (login: admin, password: admin)")
        else:
            print("Admin user already exists")
    finally:
        db.close()

