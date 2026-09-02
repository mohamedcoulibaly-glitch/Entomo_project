# Runbook — Déploiement production

## Prérequis

- Docker 24+ et Docker Compose v2
- Fichier `.env` basé sur `.env.example`
- Secret `SECRET_KEY` unique (32+ caractères)
- Mot de passe PostgreSQL fort

## Déploiement initial

```bash
cp .env.example .env
# Éditer .env (SECRET_KEY, POSTGRES_PASSWORD, CORS_ORIGINS)

docker compose up -d --build
docker compose ps
curl -s http://localhost:8000/health/ready
```

## Migrations

Les migrations Alembic s'exécutent automatiquement au démarrage du conteneur `api` via `docker-entrypoint.sh`.

Pour relancer manuellement :

```bash
docker compose exec api alembic upgrade head
```

## Seed de démonstration (optionnel)

```bash
docker compose exec api python seed.py
```

## Vérifications post-déploiement

| Endpoint | Attendu |
|----------|---------|
| `GET /health/live` | `{"status":"alive"}` |
| `GET /health/ready` | `{"status":"ready"}` |
| `GET /health` | `status: healthy` ou `degraded` |
| `GET /api/v1/docs` | Swagger UI |

## Rollback

```bash
docker compose down
docker volume rm entomo_project_entomo_pgdata  # destructif — sauvegarder avant
```

## Logs

```bash
docker compose logs -f api
docker compose logs -f db
```
