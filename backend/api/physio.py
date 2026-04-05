from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.core.security import RoleChecker
from backend.db_models.patient_physiotherapist import PatientPhysiotherapist
from backend.db_models.user import User

router = APIRouter(
    prefix="/physio",
    tags=["Fizjoterapeuta"],
    dependencies=[Depends(RoleChecker(["fizjoterapeuta"]))]
)

@router.get("/my-patients")
def get_my_patients(current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
                    db: Session = Depends(get_db)):

    connections = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.physio_id == current_user.user_id,
        PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
    ).all()

    patient_ids = [c.patient_id for c in connections]
    patients = db.query(User).filter(User.user_id.in_(patient_ids)).all()
    return patients