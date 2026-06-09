from sqlalchemy.orm import Session
from sqlalchemy import func
from db_models.physiotherapist import Physiotherapist
from db_models.pairing_request import PairingRequest
from schemas.pairing import PairingStatus

def update_physio_availability(db: Session, physio_id: int, is_available: bool):
    physio = db.query(Physiotherapist).filter(Physiotherapist.user_id == physio_id).first()
    if physio:
        physio.is_available = is_available
        db.commit()
        db.refresh(physio)
    return physio

def find_available_physio(db: Session, specialization: str = None):
    query = db.query(Physiotherapist, func.count(PairingRequest.id).label('pending_count'))\
        .outerjoin(PairingRequest, (Physiotherapist.user_id == PairingRequest.physio_id) & (PairingRequest.status == PairingStatus.PENDING))\
        .filter(Physiotherapist.is_available == True)

    if specialization:
        query = query.filter(Physiotherapist.specialization == specialization)
        
    result = query.group_by(Physiotherapist.user_id).order_by('pending_count').first()
    
    if result:
        return result[0] # Returns the Physiotherapist object
    return None

def create_pairing_request(db: Session, patient_id: int, physio_id: int, problem: str):
    db_request = PairingRequest(
        patient_id=patient_id,
        physio_id=physio_id,
        problem_description=problem,
        status=PairingStatus.PENDING
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

def get_pending_requests_for_physio(db: Session, physio_id: int):
    return db.query(PairingRequest).filter(
        PairingRequest.physio_id == physio_id,
        PairingRequest.status == PairingStatus.PENDING
    ).all()

def get_active_request_for_patient(db: Session, patient_id: int):
    return db.query(PairingRequest).filter(
        PairingRequest.patient_id == patient_id,
        PairingRequest.status.in_([PairingStatus.PENDING, PairingStatus.ACCEPTED_BY_PHYSIO])
    ).first()

def update_request_status(db: Session, request_id: int, new_status: PairingStatus):
    db_request = db.query(PairingRequest).filter(PairingRequest.id == request_id).first()
    if db_request:
        db_request.status = new_status
        db.commit()
        db.refresh(db_request)
    return db_request
