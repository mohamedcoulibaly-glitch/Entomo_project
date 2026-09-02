# Runbook — Sauvegarde et restauration

## Composants à sauvegarder

| Composant | Emplacement | Fréquence recommandée |
|-----------|-------------|----------------------|
| PostgreSQL | volume `entomo_pgdata` | Quotidien |
| Uploads (captures, rapports) | volume `entomo_uploads` | Quotidien |
| Modèles ONNX | volume `entomo_models` | Hebdomadaire |
| Configuration | fichier `.env` (hors git) | À chaque changement |

## Sauvegarde PostgreSQL

```bash
docker compose exec -T db pg_dump -U entomo entomo > backup_entomo_$(date +%Y%m%d).sql
```

## Sauvegarde volumes Docker

```bash
docker run --rm -v entomo_project_entomo_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

## Restauration PostgreSQL

```bash
docker compose exec -T db psql -U entomo -d entomo < backup_entomo_YYYYMMDD.sql
```

## Restauration uploads

```bash
docker run --rm -v entomo_project_entomo_uploads:/data -v $(pwd):/backup alpine \
  tar xzf /backup/uploads_YYYYMMDD.tar.gz -C /data
```

## Test de restauration

Effectuer un test trimestriel sur environnement de staging :

1. Restaurer un dump récent
2. Vérifier `GET /health/ready`
3. Ouvrir 3 captures avec fichiers audio/image
4. Valider une synchronisation DHIS2 de test
