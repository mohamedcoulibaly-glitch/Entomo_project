from pathlib import Path


def test_cartography_aggregates_database(client, admin_token_headers):
    response = client.get("/api/v1/cartographie/donnees", headers=admin_token_headers)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"sites", "regions", "statistiques"}
    assert body["statistiques"]["sites_actifs"] >= 1
    assert all("niveau_risque" in site for site in body["sites"])


def test_generate_and_submit_real_report(client, admin_token_headers):
    generated = client.post("/api/v1/rapports/generer", json={
        "titre": "Rapport dynamique de validation",
        "type": "personnalise",
        "format_fichier": "pdf",
        "indicateurs": ["Densité anophélienne", "Confiance IA"],
    }, headers=admin_token_headers)
    assert generated.status_code == 200, generated.text
    report = generated.json()
    assert report["statut"] == "pret"
    assert report["chemin_fichier"].endswith(".pdf")
    path = Path(report["chemin_fichier"].lstrip("/"))
    assert path.exists() and path.stat().st_size > 500

    submitted = client.post(f"/api/v1/rapports/{report['id']}/soumettre", json={
        "email": "who@example.org", "commentaire": "Validation automatique",
    }, headers=admin_token_headers)
    assert submitted.status_code == 200
    assert submitted.json()["statut"] == "soumis"

    deleted = client.delete(f"/api/v1/rapports/{report['id']}", headers=admin_token_headers)
    assert deleted.status_code == 200
    assert not path.exists()
