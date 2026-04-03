from fastapi import FastAPI
from backend.db.database import engine, Base

from backend.db_models import user


Base.metadata.create_all(bind=engine)
app = FastAPI(title = "RehabSense API", version = "1.6")


@app.get("/")
def read_root():
    return {"message": "pozdrawiam z backendu"}
