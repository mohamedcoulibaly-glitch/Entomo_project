def test_create_and_list_support_ticket(client, labo_token_headers):
    payload = {
        "sujet": "Erreur de synchronisation DHIS2",
        "categorie": "configuration",
        "priorite": "haute",
        "message": "La synchronisation reste bloquée après la validation.",
    }
    created = client.post("/api/v1/support/tickets", json=payload, headers=labo_token_headers)
    assert created.status_code == 201, created.text
    assert created.json()["statut"] == "ouvert"

    listed = client.get("/api/v1/support/tickets", headers=labo_token_headers)
    assert listed.status_code == 200
    assert any(item["sujet"] == payload["sujet"] for item in listed.json())


def test_ticket_visibility_is_scoped(client, admin_token_headers, labo_token_headers):
    labo_items = client.get("/api/v1/support/tickets", headers=labo_token_headers).json()
    admin_items = client.get("/api/v1/support/tickets", headers=admin_token_headers).json()
    assert len(admin_items) >= len(labo_items)
