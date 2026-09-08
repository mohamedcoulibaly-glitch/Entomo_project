"""Rate limiting simple pour endpoints sensibles (login)."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List

_lock = Lock()
_attempts: Dict[str, List[float]] = defaultdict(list)

# Keep the same protection in development and production. A successful login
# clears the counter, so normal local testing is not penalized.
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60


def check_login_allowed(client_key: str) -> bool:
    """False si trop de tentatives échouées dans la fenêtre."""
    now = time.time()
    with _lock:
        history = [t for t in _attempts[client_key] if now - t < LOGIN_WINDOW_SECONDS]
        _attempts[client_key] = history
        return len(history) < LOGIN_MAX_ATTEMPTS


def record_failed_login(client_key: str) -> None:
    """Enregistre une tentative échouée uniquement."""
    now = time.time()
    with _lock:
        history = [t for t in _attempts[client_key] if now - t < LOGIN_WINDOW_SECONDS]
        history.append(now)
        _attempts[client_key] = history


def reset_login_attempts(client_key: str) -> None:
    with _lock:
        _attempts.pop(client_key, None)
