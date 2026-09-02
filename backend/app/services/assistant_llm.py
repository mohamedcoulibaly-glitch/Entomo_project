"""Fournisseurs LLM optionnels pour l'assistant (Ollama / OpenAI)."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings


def _context_prompt(context: Dict[str, Any]) -> str:
    return (
        "Tu es l'assistant Entomo pour la surveillance entomologique au Sénégal. "
        "Réponds en français, de façon concise et opérationnelle.\n"
        f"Contexte plateforme: {json.dumps(context, ensure_ascii=False)}"
    )


def _parse_suggestions(reply: str) -> List[str]:
    defaults = ["Captures à valider", "État DHIS2", "Modèles déployés"]
    if len(reply) < 120:
        return defaults
    return defaults


def _call_ollama(message: str, context: Dict[str, Any]) -> Optional[str]:
    base = (settings.OLLAMA_BASE_URL or "").rstrip("/")
    if not base:
        return None
    payload = {
        "model": settings.OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": _context_prompt(context)},
            {"role": "user", "content": message},
        ],
    }
    try:
        with httpx.Client(timeout=settings.ASSISTANT_TIMEOUT_SECONDS) as client:
            response = client.post(f"{base}/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()
            return (data.get("message") or {}).get("content") or data.get("response")
    except (httpx.HTTPError, json.JSONDecodeError, KeyError):
        return None


def _call_openai(message: str, context: Dict[str, Any]) -> Optional[str]:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return None
    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": _context_prompt(context)},
            {"role": "user", "content": message},
        ],
        "temperature": 0.3,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    try:
        with httpx.Client(timeout=settings.ASSISTANT_TIMEOUT_SECONDS) as client:
            response = client.post(f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices") or []
            if not choices:
                return None
            return choices[0].get("message", {}).get("content")
    except (httpx.HTTPError, json.JSONDecodeError, KeyError):
        return None


def try_llm_reply(message: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Tente une réponse LLM selon le fournisseur configuré."""
    provider = (settings.ASSISTANT_PROVIDER or "rules").lower()
    reply = None
    if provider == "openai":
        reply = _call_openai(message, context)
    elif provider == "ollama":
        reply = _call_ollama(message, context)
    elif provider == "auto":
        reply = _call_openai(message, context) or _call_ollama(message, context)

    if not reply or not str(reply).strip():
        return None
    text = str(reply).strip()
    return {"reply": text, "suggestions": _parse_suggestions(text), "provider": provider}
