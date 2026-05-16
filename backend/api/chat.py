from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List

from db.database import get_db
from core.security import get_current_user
from db_models.user import User
from db_models.message import Message
from db_models.patient_physiotherapist import PatientPhysiotherapist
from schemas.message import MessageCreate, MessageResponse

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/contacts")
def get_contacts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns a list of users the current user can chat with.
    If Patient: returns their accepted physiotherapist(s).
    If Physio: returns their accepted patients.
    """
    if current_user.role == "pacjent":
        relations = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.patient_id == current_user.user_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).all()
        physio_ids = [r.physio_id for r in relations]
        contacts = db.query(User).filter(User.user_id.in_(physio_ids)).all()
        
    elif current_user.role == "fizjoterapeuta":
        relations = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.physio_id == current_user.user_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).all()
        patient_ids = [r.patient_id for r in relations]
        contacts = db.query(User).filter(User.user_id.in_(patient_ids)).all()
    else:
        contacts = []

    result = []
    for c in contacts:
        latest_msg = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.user_id, Message.receiver_id == c.user_id),
                and_(Message.sender_id == c.user_id, Message.receiver_id == current_user.user_id)
            )
        ).order_by(desc(Message.timestamp)).first()
        
        last_time = latest_msg.timestamp.timestamp() if latest_msg and latest_msg.timestamp else 0
        
        result.append({
            "user_id": c.user_id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "role": c.role,
            "last_activity": last_time
        })
        
    result.sort(key=lambda x: x["last_activity"], reverse=True)
    return result

@router.get("/{contact_id}", response_model=List[MessageResponse])
def get_messages(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns message history between current user and contact_id.
    """
    is_valid = False
    if current_user.role == "pacjent":
        rel = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.patient_id == current_user.user_id,
            PatientPhysiotherapist.physio_id == contact_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).first()
        if rel: is_valid = True
    elif current_user.role == "fizjoterapeuta":
        rel = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.physio_id == current_user.user_id,
            PatientPhysiotherapist.patient_id == contact_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).first()
        if rel: is_valid = True

    if not is_valid:
        raise HTTPException(status_code=403, detail="No active relationship with this user.")

    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.user_id, Message.receiver_id == contact_id),
            and_(Message.sender_id == contact_id, Message.receiver_id == current_user.user_id)
        )
    ).order_by(Message.timestamp.asc()).all()

    return messages

@router.post("/", response_model=MessageResponse)
def send_message(msg: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Send a new message to receiver_id.
    """
    contact_id = msg.receiver_id
    
    is_valid = False
    if current_user.role == "pacjent":
        rel = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.patient_id == current_user.user_id,
            PatientPhysiotherapist.physio_id == contact_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).first()
        if rel: is_valid = True
    elif current_user.role == "fizjoterapeuta":
        rel = db.query(PatientPhysiotherapist).filter(
            PatientPhysiotherapist.physio_id == current_user.user_id,
            PatientPhysiotherapist.patient_id == contact_id,
            PatientPhysiotherapist.status == "ZAAKCEPTOWANE"
        ).first()
        if rel: is_valid = True

    if not is_valid:
        raise HTTPException(status_code=403, detail="Cannot send message. No active relationship with this user.")
        
    db_msg = Message(
        sender_id=current_user.user_id,
        receiver_id=contact_id,
        content=msg.content
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
