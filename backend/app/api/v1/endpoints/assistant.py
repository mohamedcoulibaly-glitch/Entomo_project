from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.assistant_service import build_assistant_context, generate_assistant_reply

router = APIRouter()


class AssistantChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class AssistantChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = []
    context: Dict[str, Any]
    provider: str = "rules"


@router.get("/context")
def get_assistant_context(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return build_assistant_context(db)


@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(
    body: AssistantChatRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    context = build_assistant_context(db)
    result = generate_assistant_reply(body.message, context)
    return AssistantChatResponse(
        reply=result["reply"],
        suggestions=result.get("suggestions", []),
        context=context,
        provider=result.get("provider", "rules"),
    )
