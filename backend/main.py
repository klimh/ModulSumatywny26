from fastapi import FastAPI
from db.database import engine, Base

from db_models import user
from api import user as user_api

Base.metadata.create_all(bind=engine)
app = FastAPI(title = "RehabSense API", version = "1.6")

app.include_router(user_api.router)

@app.get("/")
def read_root():
    return {"message": "pozdrawiam z backendu"}
