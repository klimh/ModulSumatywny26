from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, Base

from db_models import user, patient, physiotherapist, patient_physiotherapist, exercise, rehab_plan, rehab_plan_exercise, session, exercise_result
from api import user as user_api
from api import auth as auth_api
from api import physio as physio_api
from api import patient as patient_api
from api import ai as ai_api

Base.metadata.create_all(bind=engine)
app = FastAPI(title = "RehabSense API", version = "1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_api.router)
app.include_router(user_api.router)

app.include_router(physio_api.router)

app.include_router(patient_api.router)

app.include_router(ai_api.router)
