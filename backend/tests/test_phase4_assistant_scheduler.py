"""Phase 4 — assistant LLM et planificateur de rapports."""

from datetime import datetime, timedelta

import pytest


def test_compute_next_envoi_quotidien():
    from app.services.report_scheduler import compute_next_envoi

    ref = datetime(2026, 1, 1, 8, 0, 0)
    nxt = compute_next_envoi("quotidien", ref)
    assert nxt == ref + timedelta(days=1)


def test_compute_next_envoi_hebdomadaire():
    from app.services.report_scheduler import compute_next_envoi

    ref = datetime(2026, 1, 1, 8, 0, 0)
    nxt = compute_next_envoi("hebdomadaire", ref)
    assert nxt == ref + timedelta(days=7)


def test_programmer_rapport_sets_prochain_envoi(client, admin_token_headers):
    rid = client.post("/api/v1/rapports/", json={
        "titre": "Rapport planifié",
        "type": "mensuel",
        "format_fichier": "pdf",
    }, headers=admin_token_headers).json()["id"]
    res = client.post(f"/api/v1/rapports/{rid}/programmer", json={
        "recurrence": "hebdomadaire",
        "heure_envoi": "08:00",
        "destinataires": "ops@entomo.sn",
        "actif": True,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["prochain_envoi"] is not None


def test_process_due_programmes_generates_report(db):
    from app.models.report import Rapport, RapportProgramme
    from app.services.report_scheduler import process_due_programmes

    rapport = Rapport(
        titre="Rapport auto",
        type="personnalise",
        format_fichier="csv",
        statut="brouillon",
        contenu='{"indicateurs": ["densite"]}',
    )
    db.add(rapport)
    db.flush()
    programme = RapportProgramme(
        rapport_id=rapport.id,
        recurrence="quotidien",
        heure_envoi="08:00",
        destinataires="test@entomo.sn",
        actif=True,
        prochain_envoi=datetime.utcnow() - timedelta(minutes=5),
    )
    db.add(programme)
    db.commit()

    count = process_due_programmes(db)
    assert count == 1
    db.refresh(rapport)
    db.refresh(programme)
    assert rapport.statut == "pret"
    assert rapport.chemin_fichier
    assert programme.dernier_envoi is not None
    assert programme.prochain_envoi > programme.dernier_envoi

    db.delete(programme)
    db.delete(rapport)
    db.commit()


def test_assistant_rules_fallback(client, admin_token_headers):
    res = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Combien de captures à valider ?"},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] == "rules"
    assert "capture" in body["reply"].lower()


def test_assistant_llm_ollama_mock(monkeypatch):
    from app.services.assistant_llm import try_llm_reply

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"message": {"content": "Réponse LLM mockée pour test."}}

    class FakeClient:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, json=None):
            assert "/api/chat" in url
            return FakeResponse()

    monkeypatch.setattr("app.services.assistant_llm.settings.ASSISTANT_PROVIDER", "ollama")
    monkeypatch.setattr("app.services.assistant_llm.settings.OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    monkeypatch.setattr("app.services.assistant_llm.httpx.Client", lambda **kwargs: FakeClient())

    result = try_llm_reply("Bonjour", {"captures_pending": 3})
    assert result is not None
    assert "mockée" in result["reply"]
