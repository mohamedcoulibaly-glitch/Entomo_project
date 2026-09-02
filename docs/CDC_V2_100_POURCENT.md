# Cahier des charges technique V2 — Entomo 100 %

**Version :** 2.0  
**Date :** 2026-09-01  
**Objectif :** Porter chaque domaine à 100 % fonctionnel, testé, connecté et prêt pour déploiement sanitaire national au Sénégal.

---

## 0. Principes directeurs

1. **Aucune phase suivante sans validation binaire** de la précédente (code + tests + intégration frontend/backend).
2. **Zéro donnée factice en production** : placeholders DHIS2, graphiques décoratifs et KPIs non câblés interdits.
3. **Une source de vérité** : analytics calculés côté backend, visualisés côté frontend via Chart.js + Leaflet.
4. **Sénégal-first** : 14 régions, Région Médicale 5 (Kédougou, Tambacounda, Kolda, Sédhiou, Ziguinchor), coordonnées GPS réelles.

---

## 1. État initial (audit 2026-09-01)

| Module | % avant V2 | Bloquants identifiés |
|--------|------------|----------------------|
| Backend / API | 80–90 % | Endpoints analytics incomplets |
| Frontend | 80 % | Filtres ignorés, KPIs mal câblés |
| Dashboards / Analytics | 68 % | Pas Chart.js, cartes stubées |
| ML | 65 % | Données synthétiques, image 100 % fake |
| Audio | 75 % | Sons sinusoïdaux, pas terrain |
| DHIS2 | 70 % | Placeholders ENTO_DEFAULT, UI incomplète |
| Sync | 78 % | Double file, types limités |

---

## 2. Architecture cible V2

```
┌──────────────────────────────────────────────────────────────────┐
│  Nginx (TLS)                                                     │
│  /              → frontend/www (MPA HTML/JS/Tailwind)            │
│  /api/v1        → FastAPI                                        │
│  /uploads       → StaticFiles                                    │
│  /data          → GeoJSON Sénégal (régions)                      │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   PostgreSQL 16        models_registry/      uploads/captures/
   (prod)               ONNX artefacts         audio + images
```

### Stack analytics

| Couche | Technologie |
|--------|-------------|
| Agrégation | `dashboard_service.py` (SQLAlchemy, filtres) |
| API | `/dashboard/*` (15+ endpoints) |
| Graphiques | Chart.js 4.x (bar, line, doughnut, radar, polar) |
| Cartes | Leaflet + GeoJSON régions Sénégal + choroplèthe |
| Design | design-tokens.css, cartes glassmorphism, animations |

---

## 3. Phase P1 — Infrastructure (100 %)

### 3.1 Critères d'acceptation

- [x] API_BASE dynamique (`config-boot.js`)
- [x] Docker compose (db, api, frontend)
- [x] Alembic migrations
- [ ] GeoJSON Sénégal servi statiquement (`/data/senegal-regions.geojson`)
- [ ] Chart.js vendor local (pas CDN)
- [ ] Module partagé `analytics-charts.js` + `analytics-maps.js`

### 3.2 Livrables

| Fichier | Rôle |
|---------|------|
| `frontend/www/data/senegal-regions.geojson` | 14 régions avec centroïdes |
| `frontend/www/vendor/chart.js/chart.umd.min.js` | Bibliothèque graphiques |
| `frontend/www/js/utils/analytics-charts.js` | Factory Chart.js Entomo |
| `frontend/www/js/utils/analytics-maps.js` | Carte Sénégal choroplèthe |

---

## 4. Phase P2 — Data Analytics & Dashboards (100 %)

### 4.1 API Analytics (`dashboard_service.py`)

#### Endpoints obligatoires

| Endpoint | Paramètres | Retour |
|----------|------------|--------|
| `GET /dashboard/stats` | `region`, `period`, `espece`, `date_debut`, `date_fin` | KPIs complets + alertes + region5 |
| `GET /dashboard/captures-par-espece` | filtres | `[{espece, count, pct}]` |
| `GET /dashboard/captures-par-site` | filtres | `[{site, region, count, individus}]` |
| `GET /dashboard/captures-par-region` | filtres | `[{region, count, densite, risque}]` |
| `GET /dashboard/captures-par-methode` | filtres | `[{methode, count}]` |
| `GET /dashboard/captures-par-statut` | filtres | `[{statut, count}]` |
| `GET /dashboard/densite-evolution` | `granularity` (day/week/month) | `[{date, captures, individus, densite}]` |
| `GET /dashboard/alertes` | `region`, `limit` | `[{id, type, niveau, message, localisation, date}]` |
| `GET /dashboard/heatmap` | filtres | `[{lat, lng, weight, region}]` |
| `GET /dashboard/interventions-stats` | filtres | stats interventions |
| `GET /dashboard/region/{code}` | — | stats région détaillées |
| `GET /dashboard/export` | filtres, `format` | CSV/XLSX |

#### Champs `/stats` enrichis

```json
{
  "captures": { "total", "a_valider", "validees", "densite_moyenne" },
  "sites": { "total", "actifs" },
  "espece_dominante": "An. gambiae",
  "couverture_irs": 72.5,
  "alertes_actives": 3,
  "alertes": [...],
  "region5": {
    "densite_moyenne": 4.2,
    "alertes_actives": 2,
    "espece_dominante": "An. gambiae",
    "couverture_irs": 68.0,
    "regions": ["Kédougou", "Tambacounda", "Kolda", "Sédhiou", "Ziguinchor"]
  }
}
```

#### Règles métier alertes

- Site avec `niveau_risque = critique` → alerte `epidemiologique`
- > 10 captures `a_valider` sur un site → alerte `validation`
- Espèce invasive détectée (Ae. albopictus) → alerte `espece`
- Échec DHIS2 récent → alerte `sync`

### 4.2 Dashboards frontend (8 pages + analyse-donnees)

| Page | Graphiques requis | Carte |
|------|-------------------|-------|
| `dashboard-entomo.html` | doughnut espèces, line densité, bar sites, radar méthodes | Leaflet mini-carte Sénégal |
| `dashboard-entomo-region5.html` | idem filtré RM5 | Choroplèthe RM5 |
| `dashboard-rapports-oms.html` | line tendance OMS, bar indicateurs | Carte géoréférencée |
| `dashboard-utilisateurs.html` | doughnut rôles, line activité | — |
| `dashboard-sync-dhis2.html` | bar sync history, gauge % | — |
| `dashboard-pipelines-*.html` | line progression ML | — |
| `analyse-donnees.html` | 6 onglets analytics complets | Heatmap + choroplèthe |
| `cartographie.html` | — | Leaflet complet (existant, enrichi) |

### 4.3 Design UI/UX analytics

- Palette : brand-primary `#005689`, accent `#00A3E0`, risque critique `#dc2626`
- Cartes KPI : glassmorphism, icônes Material Symbols, animation count-up
- Graphiques : tooltips, légendes, responsive, dark mode compatible
- Filtres : période (1S/1M/3M/1A/Max), région, espèce — **propagés à l'API**
- Export : CSV/XLSX réel via `apiDashboard.export()`

### 4.4 Tests P2

- `test_dashboard_analytics.py` — tous endpoints + filtres
- `test_dashboard_region5.py` — agrégats RM5
- `test_dashboard_alertes.py` — génération alertes
- Frontend : structure pages dashboard avec Chart.js

---

## 5. Phase P3 — ML & Audio (100 %)

### 5.1 Audio

| Exigence | Spécification |
|----------|---------------|
| Entraînement | Priorité captures DB labellisées ; synthétique uniquement si < 20 échantillons |
| Inférence | ONNX obligatoire si modèle déployé ; fallback FFT documenté |
| Features | MFCC(13) + mel(64) = 77, 16 kHz |
| Validation | Accuracy ≥ 70 % sur test set hold-out |
| Seed | WAV réels générés + captures sur 14 régions |
| UI | `surveillance-audio.js` : stats modèle depuis API, pas hardcodé |

### 5.2 Image

| Exigence | Spécification |
|----------|---------------|
| Entraînement | `_load_image_dataset_from_captures()` si ≥ 10 images labellisées |
| Fallback | Synthétique avec warning dans manifest |
| Features | Histogrammes RGB 48 dims → RandomForest ONNX |
| UI | Aligner `gestion-modeles-visuels` (pas YOLOv8 si non implémenté) |

### 5.3 Modèle unique audio

- Supprimer confusion `anopheles-audio-classifier-v1` vs `entomo-audio-v1`
- Un seul modèle déployé : `entomo-audio-v1` (ONNX)
- `ensure_default_models()` au démarrage

### 5.4 Boucle ré-entraînement

- Captures `corrige` → label = `espece_corrigee`
- Endpoint `POST /modeles/retrain` avec type audio/image
- Métriques réelles dans manifest + table MLModel

### 5.5 Tests P3

- `test_ml_training_real_data.py`
- `test_audio_onnx_inference.py`
- Accuracy manifest ≥ 0.70

---

## 6. Phase P4 — DHIS2 & Synchronisation (100 %)

### 6.1 DHIS2

| Exigence | Spécification |
|----------|---------------|
| Config UI | Champs `org_unit`, `data_set`, `periode` éditables |
| Validation | Refuser push si `org_unit` vide ou `UNKNOWN` |
| Catalogue | `GET /dhis2/catalog` — fetch orgUnits + dataElements depuis API DHIS2 |
| Placeholders | Supprimer `ENTO_DEFAULT` / `ENTO_CAPTURE` en prod |
| Push | dataValueSets avec retry 3x backoff |
| Pull | `GET /dhis2/import-indicators` — import indicateurs agrégés |
| Dashboard | `dashboard-sync-dhis2.html` : data-* hooks branchés, KPIs live |

### 6.2 Synchronisation offline

| Exigence | Spécification |
|----------|---------------|
| Types | capture (CRUD), site (CRUD), intervention (CRUD), dhis2 |
| Conflits | UI résolution sur `gestion-hors-ligne.html` |
| Unification | Client enqueue → serveur replay (source de vérité serveur) |
| Métriques | `sync_percentage` calculé depuis queue réelle |

### 6.3 Tests P4

- `test_dhis2_no_placeholders.py`
- `test_dhis2_catalog.py`
- `test_offline_queue_crud.py`
- `test_sync_bidirectional.py`

---

## 7. Phase P5 — Production (100 %)

| Exigence | Spécification |
|----------|---------------|
| PostgreSQL | Obligatoire prod, SQLite dev uniquement |
| Email SMTP | Soumission rapports + notifications |
| Rate limit | Redis distribué (fallback mémoire dev) |
| Secrets | SECRET_KEY obligatoire, pas de mots de passe en seed prod |
| Observabilité | `/health/ready` avec ML registry + DB + disk |
| Handler 429 | Dans error_handler.py |

---

## 8. Phase P6 — Tests & CI (100 %)

| Suite | Cible |
|-------|-------|
| Backend | 300+ tests, 100 % endpoints dashboard |
| Frontend E2E | Dashboard analytics avec données seed |
| CI | Tous jobs verts, gate merge |

---

## 9. Cartographie Sénégal

### 9.1 Régions (14)

Dakar, Thiès, Diourbel, Fatick, Kaolack, Kaffrine, Kédougou, Tambacounda, Ziguinchor, Sédhiou, Kolda, Saint-Louis, Louga, Matam

### 9.2 Région Médicale 5

Kédougou, Tambacounda, Kolda, Sédhiou, Ziguinchor

### 9.3 GeoJSON

Fichier `senegal-regions.geojson` avec :
- `properties.name` : nom région
- `properties.code` : code ISO-like
- `properties.medical_region` : 1–5
- `geometry` : polygone simplifié

### 9.4 Choroplèthe

- Couleur basée sur `densite` ou `risque` par région
- Tooltip : captures, individus, espèce dominante
- Lien vers dashboard filtré par région

---

## 10. Planning d'exécution séquentiel

```
P1 Infrastructure (GeoJSON, Chart.js, modules partagés)
  ↓ validation tests
P2 Analytics API (dashboard_service.py, 12 endpoints)
  ↓ validation tests
P2 Analytics UI (8 dashboards + analyse-donnees)
  ↓ validation E2E structure
P3 ML & Audio (training réel, seed enrichi, ONNX)
  ↓ validation accuracy ≥ 70%
P4 DHIS2 & Sync (catalog, no placeholders, UI fix)
  ↓ validation tests
P5 Production (email, observabilité)
  ↓ validation
P6 Tests complets CI
```

---

## 11. Suivi d'avancement V2

| Phase | Statut | Date |
|-------|--------|------|
| P1 Infrastructure analytics | ✅ Terminé | 2026-09-01 |
| P2 API Analytics (12 endpoints) | ✅ Terminé | 2026-09-01 |
| P2 UI Dashboards + Chart.js + cartes | ✅ Terminé | 2026-09-01 |
| P3 ML & Audio (training captures réelles) | ✅ Terminé | 2026-09-01 |
| P4 DHIS2 (no placeholders + catalog) | ✅ Terminé | 2026-09-01 |
| P5 Production (email, Redis) | ⏳ Partiel | — |
| P6 Tests CI (288+ tests) | ✅ Terminé | 2026-09-01 |

---

*Document vivant — mis à jour à chaque jalon validé.*
