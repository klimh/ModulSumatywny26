from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from db_models.pairing_request import PairingRequest
from schemas.pairing import PairingStatus
from core.pairing import find_available_physio, create_pairing_request

def check_and_reassign_expired_requests(db: Session, expiration_hours: int = 24):
    """
    Znajduje prośby o statusie REJECTED oraz PENDING, na które fizjoterapeuta 
    nie zareagował od 'expiration_hours' godzin. Następnie zmienia ich status
    na EXPIRED i przypisuje nowego fizjoterapeutę.
    """
    now = datetime.utcnow()
    expiration_threshold = now - timedelta(hours=expiration_hours)

    expired_pending = db.query(PairingRequest).filter(
        PairingRequest.status == PairingStatus.PENDING,
        PairingRequest.updated_at < expiration_threshold
    ).all()

    rejected_requests = db.query(PairingRequest).filter(
        PairingRequest.status == PairingStatus.REJECTED
    ).all()

    requests_to_reassign = expired_pending + rejected_requests

    for req in requests_to_reassign:
        # Wygaśnięcie starych próśb
        req.status = PairingStatus.EXPIRED
        
        # Znajdź nowego fizjoterapeutę (najlepiej o najmniejszym obciążeniu)
        new_physio = find_available_physio(db)
        
        if new_physio:
            create_pairing_request(
                db, 
                patient_id=req.patient_id, 
                physio_id=new_physio.user_id, 
                problem=req.problem_description
            )
        
    db.commit()
