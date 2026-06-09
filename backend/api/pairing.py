from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from typing import List
from db.database import get_db
from core.security import RoleChecker
from db_models.user import User
from db_models.patient_physiotherapist import PatientPhysiotherapist
from db_models.pairing_request import PairingRequest
from schemas.pairing import PairingRequestCreate, PairingRequestResponse, PairingStatus
from core.pairing import (
    find_available_physio,
    create_pairing_request,
    get_pending_requests_for_physio,
    update_request_status,
    get_active_request_for_patient
)

router = APIRouter(
    prefix="/pairing",
    tags=["Pairing"]
)

@router.post("/request")
def request_pairing(
    data: PairingRequestCreate,
    current_user: User = Depends(RoleChecker(["pacjent"])),
    db: DBSession = Depends(get_db)
):
    existing = get_active_request_for_patient(db, current_user.user_id)
    if existing:
        raise HTTPException(status_code=400, detail="Masz już aktywne zapytanie o sparowanie.")
        
    physio = find_available_physio(db, data.required_specialization)
    if not physio:
        raise HTTPException(status_code=404, detail="Brak dostępnych fizjoterapeutów o podanej specjalizacji.")
        
    request = create_pairing_request(
        db, 
        patient_id=current_user.user_id,
        physio_id=physio.user_id,
        problem=data.problem_description
    )
    
    return {
        "message": "Zapytanie wysłane do fizjoterapeuty",
        "request_id": request.id,
        "physio_id": physio.user_id
    }

@router.get("/physio/pending", response_model=List[PairingRequestResponse])
def get_pending_requests(
    current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    requests = get_pending_requests_for_physio(db, current_user.user_id)
    return requests

class PhysioResponseData(BaseModel):
    action: str # "accept" or "reject"

@router.post("/{request_id}/physio-respond")
def physio_respond(
    request_id: int,
    data: PhysioResponseData,
    current_user: User = Depends(RoleChecker(["fizjoterapeuta"])),
    db: DBSession = Depends(get_db)
):
    req = db.query(PairingRequest).filter(PairingRequest.id == request_id).first()
    if not req or req.physio_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Nie znaleziono zapytania")
        
    if req.status != PairingStatus.PENDING:
        raise HTTPException(status_code=400, detail="Zły status zapytania")
        
    if data.action == "accept":
        update_request_status(db, request_id, PairingStatus.ACCEPTED_BY_PHYSIO)
        return {"message": "Zapytanie zaakceptowane, oczekiwanie na pacjenta."}
    elif data.action == "reject":
        update_request_status(db, request_id, PairingStatus.REJECTED)
        # Background task will pick this up and re-assign
        return {"message": "Zapytanie odrzucone."}
    else:
        raise HTTPException(status_code=400, detail="Nieznana akcja")

@router.post("/{request_id}/patient-confirm")
def patient_confirm(
    request_id: int,
    current_user: User = Depends(RoleChecker(["pacjent"])),
    db: DBSession = Depends(get_db)
):
    req = db.query(PairingRequest).filter(PairingRequest.id == request_id).first()
    if not req or req.patient_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Nie znaleziono zapytania")
        
    if req.status != PairingStatus.ACCEPTED_BY_PHYSIO:
        raise HTTPException(status_code=400, detail="Fizjoterapeuta jeszcze nie zaakceptował")
        
    update_request_status(db, request_id, PairingStatus.COMPLETED)
    
    connection = db.query(PatientPhysiotherapist).filter(
        PatientPhysiotherapist.patient_id == current_user.user_id
    ).first()
    
    if connection:
        connection.physio_id = req.physio_id
        connection.status = "ZAAKCEPTOWANE"
    else:
        connection = PatientPhysiotherapist(
            patient_id=current_user.user_id,
            physio_id=req.physio_id,
            status="ZAAKCEPTOWANE"
        )
        db.add(connection)
        
    db.commit()
    return {"message": "Sparowanie zakończone sukcesem!"}
