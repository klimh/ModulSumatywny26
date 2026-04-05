from fastapi import FastAPI
from backend.db.database import engine, Base

from backend.db_models import user, patient, physiotherapist, patient_physiotherapist
from backend.api import user as user_api
from backend.api import auth as auth_api

Base.metadata.create_all(bind=engine)
app = FastAPI(title = "RehabSense API", version = "1.0")

app.include_router(auth_api.router)
app.include_router(user_api.router)

@app.get("/")
def read_root():
    return {"message": "pozdrawiam z backendu"}
