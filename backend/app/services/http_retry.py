"""Retry HTTP avec backoff exponentiel pour appels externes (DHIS2, etc.)."""

from __future__ import annotations

import time
from typing import Any, Callable, Optional, Tuple

import httpx

DEFAULT_MAX_ATTEMPTS = 4
DEFAULT_INITIAL_DELAY = 1.0
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def request_with_retry(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    initial_delay: float = DEFAULT_INITIAL_DELAY,
    **kwargs: Any,
) -> httpx.Response:
    delay = initial_delay
    last_exc: Optional[Exception] = None
    for attempt in range(max_attempts):
        try:
            response = client.request(method, url, **kwargs)
            if response.status_code not in RETRYABLE_STATUS:
                return response
            if attempt >= max_attempts - 1:
                return response
        except httpx.RequestError as exc:
            last_exc = exc
            if attempt >= max_attempts - 1:
                raise
        time.sleep(delay)
        delay = min(delay * 2, 30.0)
    if last_exc:
        raise last_exc
    raise RuntimeError("request_with_retry: état inattendu")


def compute_queue_backoff_seconds(retry_count: int) -> int:
    """Délai avant prochain essai file offline (30s, 60s, 120s, … max 15 min)."""
    base = 30
    return min(base * (2 ** max(0, retry_count - 1)), 900)
