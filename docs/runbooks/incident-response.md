# Runbook — Réponse aux incidents

## API indisponible (503 sur /health/ready)

1. Vérifier PostgreSQL : `docker compose ps db`
2. Logs API : `docker compose logs --tail=200 api`
3. Tester la DB : `docker compose exec db pg_isready -U entomo`
4. Redémarrer l'API : `docker compose restart api`

## Base de données saturée

1. Identifier les connexions : `docker compose exec db psql -U entomo -c "SELECT count(*) FROM pg_stat_activity;"`
2. Redémarrer le pool en redémarrant `api`
3. Planifier un vacuum si nécessaire

## DHIS2 inaccessible

1. `GET /health/dhis2` — vérifier `configured` et `message`
2. Tester depuis l'UI : Configuration DHIS2 → Test connexion
3. Vérifier URL, credentials et pare-feu sortant

## File offline bloquée

1. `GET /api/v1/sync/queue` (authentifié admin)
2. Rejouer un item : `POST /api/v1/sync/queue/{id}/replay`
3. Traiter la file : `POST /api/v1/sync/queue/process`

## Modèles ML dégradés

1. `GET /health` → section `ml_registry`
2. `GET /api/v1/modeles/registry`
3. Relancer un pipeline d'entraînement depuis l'UI Pipelines ML

## Escalade

- Niveau 1 : équipe technique plateforme
- Niveau 2 : responsable données / DHIS2
- Niveau 3 : support ministère santé
