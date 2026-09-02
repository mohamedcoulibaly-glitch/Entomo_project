"""Tests de charge légers — 100 requêtes concurrentes sur endpoints publics."""

from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest


@pytest.mark.parametrize("path", ["/health", "/health/live", "/health/ready"])
def test_concurrent_health_requests(client, path):
    def call():
        return client.get(path)

    workers = 100
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(call) for _ in range(workers)]
        statuses = [future.result().status_code for future in as_completed(futures)]

    assert len(statuses) == workers
    assert all(code in {200, 503} for code in statuses)
    assert statuses.count(200) >= workers * 0.95


def test_concurrent_login_attempts(client):
    def call():
        return client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "wrong-password",
        })

    workers = 50
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(call) for _ in range(workers)]
        responses = [future.result() for future in as_completed(futures)]

    assert len(responses) == workers
    assert all(res.status_code in {401, 422, 429} for res in responses)
