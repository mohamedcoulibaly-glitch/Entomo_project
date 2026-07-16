from datetime import datetime

from app.models.notification import Notification


def test_notification_actions_are_scoped_to_current_user(client, db, admin_token_headers, labo_token_headers, admin_id, labo_id):
    admin_notification = Notification(
        utilisateur_id=admin_id,
        titre="Notification admin",
        message="Visible uniquement par l'administrateur",
        type_notification="info",
        lu=False,
    )
    labo_notification = Notification(
        utilisateur_id=labo_id,
        titre="Notification laboratoire",
        message="Visible uniquement par le laboratoire",
        type_notification="warning",
        lu=False,
    )
    db.add_all([admin_notification, labo_notification])
    db.commit()
    db.refresh(admin_notification)
    db.refresh(labo_notification)

    admin_items = client.get("/api/v1/notifications/", headers=admin_token_headers)
    assert admin_items.status_code == 200
    assert {item["id"] for item in admin_items.json()} == {admin_notification.id}

    forbidden_mark = client.post(f"/api/v1/notifications/{labo_notification.id}/lire", headers=admin_token_headers)
    assert forbidden_mark.status_code == 200
    assert forbidden_mark.json()["message"] == "Notification non trouvée"
    db.refresh(labo_notification)
    assert labo_notification.lu is False

    own_mark = client.post(f"/api/v1/notifications/{admin_notification.id}/lire", headers=admin_token_headers)
    assert own_mark.status_code == 200
    db.refresh(admin_notification)
    assert admin_notification.lu is True
    assert isinstance(admin_notification.date_lecture, datetime)


def test_mark_all_notifications_only_updates_current_user(client, db, admin_token_headers, labo_token_headers, admin_id, labo_id):
    admin_notification = Notification(utilisateur_id=admin_id, titre="Admin non lue", lu=False)
    labo_notification = Notification(utilisateur_id=labo_id, titre="Labo non lue", lu=False)
    db.add_all([admin_notification, labo_notification])
    db.commit()

    response = client.post("/api/v1/notifications/tout-lire", headers=admin_token_headers)
    assert response.status_code == 200
    db.refresh(admin_notification)
    db.refresh(labo_notification)
    assert admin_notification.lu is True
    assert labo_notification.lu is False

