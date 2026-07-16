from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.db.session import get_db
from app.models.support import SupportTicket
from app.models.user import User
from app.schemas.support import SupportTicketCreate, SupportTicketResponse, SupportTicketUpdate


router = APIRouter()


@router.get("/tickets", response_model=List[SupportTicketResponse])
def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(SupportTicket)
    if not current_user.is_superuser:
        query = query.filter(SupportTicket.utilisateur_id == current_user.id)
    return query.order_by(SupportTicket.created_at.desc()).limit(100).all()


@router.post("/tickets", response_model=SupportTicketResponse, status_code=201)
def create_ticket(
    ticket_in: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ticket = SupportTicket(utilisateur_id=current_user.id, **ticket_in.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.put("/tickets/{ticket_id}", response_model=SupportTicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_in: SupportTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Demande d'assistance introuvable")
    if not current_user.is_superuser and ticket.utilisateur_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    data = ticket_in.model_dump(exclude_unset=True)
    if not current_user.is_superuser:
        data = {key: value for key, value in data.items() if key == "statut" and value == "ferme"}
    if not data:
        raise HTTPException(status_code=400, detail="Aucune modification autorisée")
    for field, value in data.items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return ticket
