import io
from openpyxl import Workbook


def test_import_csv_creates_captures_and_history(client, admin_token_headers, site1_id):
    csv_content = (
        "site_id,date_capture,espece,sexe,quantite,notes\n"
        f"{site1_id},2026-07-06T08:30:00,Anopheles gambiae,F,12,Import test\n"
    ).encode("utf-8")
    response = client.post(
        "/api/v1/import/upload",
        headers=admin_token_headers,
        files={"file": ("captures.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert response.json()["rejected"] == 0

    captures = client.get("/api/v1/captures/", headers=admin_token_headers).json()
    assert any(c["notes"] == "Import test" and c["nombre_individus"] == 12 for c in captures)

    history = client.get("/api/v1/import/history", headers=admin_token_headers)
    assert history.status_code == 200
    assert history.json()[0]["filename"] == "captures.csv"
    assert history.json()[0]["statut"] == "succes"


def test_import_csv_reports_invalid_rows(client, admin_token_headers):
    csv_content = (
        "code_site,date_capture,espece,quantite\n"
        "INCONNU,not-a-date,,abc\n"
    ).encode("utf-8")
    response = client.post(
        "/api/v1/import/upload",
        headers=admin_token_headers,
        files={"file": ("invalid.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["imported"] == 0
    assert response.json()["rejected"] == 1
    assert response.json()["statut"] == "erreur"
    assert "Ligne 2" in response.json()["errors"][0]


def test_import_rejects_unsupported_extension(client, admin_token_headers):
    response = client.post(
        "/api/v1/import/upload",
        headers=admin_token_headers,
        files={"file": ("captures.exe", b"invalid", "application/octet-stream")},
    )
    assert response.status_code == 400


def test_import_xlsx_creates_capture(client, admin_token_headers, site2_id):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["site_id", "date_capture", "espece", "quantite", "notes"])
    sheet.append([site2_id, "2026-07-06 09:15", "Culex pipiens", 7, "Import Excel"])
    content = io.BytesIO()
    workbook.save(content)
    content.seek(0)

    response = client.post(
        "/api/v1/import/upload",
        headers=admin_token_headers,
        files={
            "file": (
                "captures.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert response.json()["statut"] == "succes"
