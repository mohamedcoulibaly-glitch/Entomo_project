# Cahier des charges technique — Entomo Platform
## Objectif : 100 % fonctionnel, synchronisé, testé et prêt production

| Métadonnée | Valeur |
|------------|--------|
| **Version** | 1.0.0 |
| **Date** | 2026-09-01 |
| **Statut** | Document de référence — exécution obligatoire |
| **Périmètre** | Backend, Frontend, API, ML/Audio, DHIS2, Offline/PWA, UI/UX, Tests |
| **État actuel estimé** | ~70 % (MVP démo) → **Cible : 100 % production terrain** |

---

## Table des matières

1. [Vision et objectifs](#1-vision-et-objectifs)
2. [État des lieux et écarts](#2-état-des-lieux-et-écarts)
3. [Architecture cible](#3-architecture-cible)
4. [Spécifications Backend](#4-spécifications-backend)
5. [Spécifications API REST](#5-spécifications-api-rest)
6. [Spécifications Machine Learning & Audio](#6-spécifications-machine-learning--audio)
7. [Spécifications DHIS2 & Synchronisation](#7-spécifications-dhis2--synchronisation)
8. [Spécifications Mode hors-ligne & PWA](#8-spécifications-mode-hors-ligne--pwa)
9. [Spécifications Frontend & UI/UX](#9-spécifications-frontend--uiux)
10. [Matrice pages ↔ API ↔ données](#10-matrice-pages--api--données)
11. [Sécurité, permissions & audit](#11-sécurité-permissions--audit)
12. [Stratégie de tests (intégration & E2E)](#12-stratégie-de-tests-intégration--e2e)
13. [Plan de livraison par phases](#13-plan-de-livraison-par-phases)
14. [Critères d'acceptation globaux (Definition of Done)](#14-critères-dacceptation-globaux-definition-of-done)
15. [Annexes](#15-annexes)

---

## 1. Vision et objectifs

### 1.1 Mission produit

Entomo est une plateforme de **surveillance entomologique** pour la lutte antivectorielle en Afrique, intégrée au **DHIS2** (OMS/PNLP). Elle doit permettre :

- La collecte terrain (captures, sites, interventions, campagnes)
- L'analyse scientifique (audio, image, risque épidémiologique)
- La validation et transmission vers les systèmes nationaux
- Le fonctionnement **hors connexion** sur le terrain
- Une expérience utilisateur **professionnelle, cohérente et sans régression visuelle**

### 1.2 Objectifs techniques du passage à 100 %

| # | Objectif | Mesure de succès |
|---|----------|------------------|
| O1 | Zéro endpoint « décoratif » | Chaque route API a un cas d'usage réel, testé, documenté OpenAPI |
| O2 | Zéro page frontend orpheline | Chaque écran consomme des données réelles ou affiche un état vide explicite |
| O3 | Zéro action UI factice | Suppression de `pages-generiques.js` et de toutes les notifications sans effet |
| O4 | ML/audio production-grade | Précision ≥ 85 % sur jeu de test terrain (holdout), modèle versionné |
| O5 | Sync bidirectionnelle fiable | File offline + DHIS2 + replay idempotent, 0 perte de données |
| O6 | UI/UX premium | Design system unifié, responsive, accessible WCAG 2.1 AA |
| O7 | Zéro asset cassé | Toutes images/icônes/avatars locaux ou fallback gracieux |
| O8 | Couverture tests | ≥ 300 tests backend, ≥ 120 tests frontend E2E, CI verte |

### 1.3 Principes directeurs

1. **Source de vérité unique** : PostgreSQL en production ; SQLite uniquement en dev/test.
2. **Contrat API strict** : schémas Pydantic = contrat ; breaking change = version `/api/v2`.
3. **Offline-first pour le terrain** : écriture locale garantie, sync best-effort avec retry exponentiel.
4. **Permissions côté serveur** : le frontend filtre l'UI ; le backend **refuse** les actions non autorisées (403).
5. **Traçabilité totale** : chaque action sensible génère un `AuditLog`.
6. **Tests avant merge** : aucune PR sans tests d'intégration sur le périmètre modifié.

---

## 2. État des lieux et écarts

### 2.1 Complétude actuelle (baseline vérifiée)

| Domaine | Actuel | Cible | Écart principal |
|---------|--------|-------|-----------------|
| Backend API métier | 75 % | 100 % | Permissions, audit, scheduler, migrations prod |
| Frontend UI | 80 % | 100 % | Design system, offline, assets, fallbacks |
| API REST (surface) | 85 % | 100 % | Enforcement sécurité, cohérence erreurs |
| ML / pipelines | 40 % | 100 % | Entraînement réel, artefacts, évaluation |
| Audio / bioacoustique | 55 % | 100 % | Modèle entraîné, preprocessing, métriques honnêtes |
| DHIS2 | 75 % | 100 % | Sync granulaire, conflits, test connexion réelle |
| Offline / PWA | 65 % | 100 % | Precache, cache lecture, queue étendue |
| Assistant | 55 % | 100 % | LLM ou renommage + capacités réelles |
| Sécurité | 60 % | 100 % | RBAC appliqué, audit, validation uploads |
| Tests | 75 % | 100 % | E2E métier, ML terrain, offline bout-en-bout |
| UI/UX / assets | 70 % | 100 % | Avatars Google CDN, Tailwind CDN, images cassées |

### 2.2 Dette technique identifiée (à éliminer)

| ID | Dette | Fichiers concernés | Action |
|----|-------|-------------------|--------|
| D1 | Permissions non appliquées backend | `permissions.py`, tous les endpoints | Middleware `require_permission()` |
| D2 | Audit lecture seule | `audit.py`, `audit_log.py` | Service `AuditService.log()` + hooks |
| D3 | Pipeline ML simulé | `pipeline_runner.py` | Remplacer par vrai training job |
| D4 | Classifieur audio heuristique | `audio_classifier.py` | Modèle ONNX entraîné + preprocessing |
| D5 | Fallbacks UI factices | `pages-generiques.js` | Supprimer ou isoler en mode démo explicite |
| D6 | Avatars Google CDN hardcodés | ~40 pages HTML | Composant avatar local + initiales |
| D7 | Tailwind CDN | Toutes les pages | Build Tailwind local (`npm run build:css`) |
| D8 | `create_all()` au démarrage | `main.py` | Alembic migration initiale complète |
| D9 | Export audio factice | `surveillance-audio.js` | Export CSV/JSON réel |
| D10 | Notifications header locales | `core.js` | Brancher `apiNotifications` |
| D11 | `config_id` DHIS2 en dur | `dashboard-sync-dhis2.js` | Config dynamique |
| D12 | 0 artefact ML dans le repo | `models/` (à créer) | Registry versionné ONNX/PT |

---

## 3. Architecture cible

### 3.1 Diagramme logique

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (PWA)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Pages UI │ │ api.js   │ │ Offline  │ │ SW Cache │ │ Design System│  │
│  │ (50+)    │ │ (client) │ │ Store    │ │ (precache│ │ (tokens CSS) │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────────┘  │
└───────┼────────────┼────────────┼────────────┼────────────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY  /api/v1  (FastAPI)                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ Auth JWT   │ │ RBAC       │ │ Audit      │ │ Rate limit / CORS  │   │
│  │ + refresh  │ │ middleware │ │ middleware │ │                    │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘   │
└───────┬──────────────┬──────────────┬──────────────┬──────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐
│ PostgreSQL │ │ ML Runtime │ │ DHIS2      │ │ Workers (async jobs)   │
│ (prod)     │ │ ONNX/PT    │ │ Client HTTP│ │ reports, training,   │
│            │ │ + ffmpeg   │ │            │ │ sync queue             │
└────────────┘ └────────────┘ └────────────┘ └────────────────────────┘
```

### 3.2 Stack technique cible

| Couche | Technologie actuelle | Cible production |
|--------|---------------------|------------------|
| Backend | FastAPI 0.115, SQLAlchemy 2 | Identique + APScheduler/Celery |
| Base de données | SQLite (dev) | **PostgreSQL 15+** (prod) |
| Migrations | `create_all()` + 3 Alembic | **Alembic complet** (init + incrémental) |
| ML inference | FFT heuristique | **ONNX Runtime** + modèle versionné |
| ML training | Simulé | **scikit-learn / PyTorch** + MLflow ou registry interne |
| Audio | scipy WAV only | **pydub/ffmpeg** (MP3, OGG, M4A) |
| Frontend CSS | Tailwind CDN | **Tailwind build local** + purge |
| PWA | SW basique | **Workbox** ou SW avancé (precache + stale-while-revalidate) |
| Tests backend | pytest (209) | pytest + **≥ 300 tests** |
| Tests frontend | Playwright (62) | Playwright + **≥ 120 scénarios E2E** |
| CI | (à définir) | GitHub Actions : lint + test + build |

### 3.3 Structure de dossiers à créer/compléter

```
Entomo_project/
├── docs/                          # Ce document + ADR + runbooks
├── backend/
│   ├── alembic/versions/          # Migration initiale complète
│   ├── app/
│   │   ├── core/permissions.py    # + dépendances FastAPI
│   │   ├── middleware/audit.py    # NOUVEAU
│   │   ├── services/
│   │   │   ├── ml_training.py     # NOUVEAU — vrai entraînement
│   │   │   ├── image_classifier.py # NOUVEAU
│   │   │   └── audit_service.py   # NOUVEAU
│   │   └── workers/               # NOUVEAU — jobs async
│   ├── models_registry/           # NOUVEAU — artefacts ONNX versionnés
│   └── tests/
│       ├── integration/           # NOUVEAU — tests cross-module
│       └── e2e/                   # NOUVEAU — scénarios complets
├── frontend/
│   ├── package.json               # NOUVEAU — build Tailwind
│   ├── tailwind.config.js         # NOUVEAU
│   ├── tests/
│   │   ├── e2e/                   # Scénarios Playwright étendus
│   │   └── visual/                # NOUVEAU — régression visuelle
│   └── www/
│       ├── assets/                # NOUVEAU — images, icônes, avatars
│       ├── css/dist/              # NOUVEAU — Tailwind compilé
│       └── components/            # NOUVEAU — partials HTML réutilisables
└── .github/workflows/ci.yml       # NOUVEAU
```

---

## 4. Spécifications Backend

### 4.1 Modules et exigences détaillées

#### 4.1.1 Authentification & sessions (cible 100 %)

| Exigence | Description | Critère d'acceptation |
|----------|-------------|----------------------|
| AUTH-01 | JWT access + refresh token | Refresh via `POST /auth/refresh` ; access expire 15 min |
| AUTH-02 | Révocation de session | `POST /auth/logout-all` invalide tous les tokens |
| AUTH-03 | Audit login/logout | Chaque connexion/déconnexion → `AuditLog` |
| AUTH-04 | Rate limiting login | Max 5 tentatives / 15 min / IP |
| AUTH-05 | Mot de passe | Politique : 8+ chars, majuscule, chiffre |

**Tests requis :** `test_auth_refresh.py`, `test_auth_rate_limit.py`, `test_auth_audit.py`

#### 4.1.2 Permissions RBAC (cible 100 %)

| Permission | Routes protégées |
|------------|-----------------|
| `captures:voir` | `GET /captures/*` |
| `captures:creer` | `POST /captures` |
| `captures:valider` | `PUT /captures/{id}/valider`, `PUT /captures/{id}/rejeter` |
| `captures:exporter` | `GET /captures/export/*` |
| `dhis2:gestion` | `POST/PUT/DELETE /dhis2/*` |
| `dhis2:sync` | `POST /dhis2/sync`, `POST /dhis2/push` |
| `modeles:gestion` | `POST/PUT/DELETE /modeles/*` |
| `audit:voir` | `GET /audit/*` |
| `admin` | Routes superuser |

**Implémentation obligatoire :**

```python
# app/core/permissions.py — à étendre
def require_permission(*perms: str):
    def dependency(current_user: User = Depends(get_current_user)):
        if not user_has_permission(current_user, perms):
            raise HTTPException(403, detail="Permission refusée")
        return current_user
    return dependency
```

Appliquer sur **chaque endpoint** non-public. Test : `test_z_permissions_enforcement.py` — 403 pour rôle sans permission.

#### 4.1.3 Audit (cible 100 %)

| Action auditée | Champs `AuditLog` |
|----------------|-------------------|
| Login / logout | `action`, `utilisateur_id`, `ip`, `user_agent` |
| CRUD capture | `resource_type=capture`, `resource_id`, `changes` (JSON diff) |
| Validation / rejet | `action=validate|reject`, `resource_id` |
| Sync DHIS2 | `action=dhis2_sync`, `statut`, `records_count` |
| Changement config DHIS2 | `action=config_change`, `changes` |
| Déploiement modèle ML | `action=model_deploy`, `model_id`, `version` |
| Export données | `action=export`, `format`, `record_count` |

**Service :** `AuditService.log(db, user, action, **kwargs)` appelé depuis endpoints et middleware.

#### 4.1.4 Captures (cible 100 %)

| Exigence | Description |
|----------|-------------|
| CAP-01 | Upload image avec validation MIME + taille max 10 Mo |
| CAP-02 | Upload audio WAV/MP3/OGG/M4A avec conversion ffmpeg |
| CAP-03 | Analyse audio → `audio_metadata` JSON structuré |
| CAP-04 | Analyse image → `image_metadata` JSON (espèce, confiance, bbox) |
| CAP-05 | Workflow statuts : `brouillon → a_valider → valide → rejete` |
| CAP-06 | Export CSV/XLSX avec permissions `captures:exporter` |
| CAP-07 | Stats audio : vraie précision/rappel vs `espece_corrigee` |

**Schéma `audio_metadata` cible :**

```json
{
  "espece_detectee": "An. gambiae",
  "confiance": 0.92,
  "distribution": {"An. gambiae": 0.92, "Ae. aegypti": 0.05},
  "frequence_dominante_hz": 445.2,
  "modele": "audio-cnn-v2.1.0",
  "modele_version": "2.1.0",
  "temps_traitement_ms": 120,
  "duree_sec": 3.5,
  "preprocessing": "mel_128_16khz",
  "qualite_signal": "bon"
}
```

#### 4.1.5 Modèles ML & pipelines (cible 100 %)

| Exigence | Description |
|----------|-------------|
| ML-01 | Registry `backend/models_registry/` avec manifest JSON par modèle |
| ML-02 | Import `.onnx`, `.pt`, `.pkl` avec validation checksum SHA-256 |
| ML-03 | Pipeline d'entraînement réel : dataset → features → train → evaluate → export |
| ML-04 | Job async (thread ou Celery) avec statuts : `queued → running → completed → failed` |
| ML-05 | Logs pipeline persistés et consultables via API |
| ML-06 | Évaluation : matrice de confusion, précision/rappel/F1 par espèce |
| ML-07 | Déploiement atomique : un seul modèle `deploye=true` par type (audio/image) |
| ML-08 | Rollback : réactiver version précédente en 1 clic |

**Remplacement `pipeline_runner.py` :**

- `step_extract` : extraction mel-spectrogrammes depuis dataset annotations
- `step_train` : entraînement CNN (PyTorch) ou RandomForest (tabular)
- `step_evaluate` : holdout 20 %, métriques réelles
- `step_export` : export ONNX + enregistrement dans registry
- `step_deploy` : activation modèle + audit log

#### 4.1.6 Rapports programmés (cible 100 %)

| Exigence | Description |
|----------|-------------|
| RPT-01 | APScheduler ou Celery Beat exécute `RapportProgramme` |
| RPT-02 | Formats : PDF, CSV, XLSX |
| RPT-03 | Notification à l'utilisateur à la fin de génération |
| RPT-04 | Historique des exécutions avec statut succès/échec |

#### 4.1.7 Migrations & base de données (cible 100 %)

| Exigence | Description |
|----------|-------------|
| DB-01 | Migration Alembic initiale `0001_initial_schema.py` — toutes les tables |
| DB-02 | Support PostgreSQL via `DATABASE_URL` env var |
| DB-03 | Supprimer `Base.metadata.create_all()` en production |
| DB-04 | `ensure_schema_compatibility()` conservé uniquement pour SQLite dev |
| DB-05 | Index sur colonnes filtrées : `captures.statut`, `captures.site_id`, `captures.date_capture` |
| DB-06 | Seed script idempotent pour données de démo |

---

## 5. Spécifications API REST

### 5.1 Inventaire des routeurs (22 modules — tous à 100 %)

| Préfixe | Routes actuelles | Compléments requis |
|---------|-----------------|-------------------|
| `/auth` | 10 | + refresh, audit login |
| `/users` | 5 | + permissions check |
| `/roles` | 7 | OK |
| `/sites` | 7 | OK |
| `/captures` | 12 | + analyse image, stats honnêtes |
| `/datasets` | 7 | OK |
| `/modeles` | 18 | + vrai training, registry |
| `/dhis2` | 12 | + sync granulaire, conflits |
| `/rapports` | 10 | + scheduler trigger |
| `/dashboard` | 4 | OK |
| `/indicateurs` | 9 | OK |
| `/langues` | 7 | OK |
| `/sync` | 7 | + replay par resource_type |
| `/interventions` | 5 | + tests |
| `/notifications` | 4 | + push optionnel |
| `/audit` | 2 | + écriture automatique |
| `/campagnes` | 5 | + tests |
| `/reference` | 6 | OK |
| `/import` | 2 | OK |
| `/cartographie` | 1 | + filtres date/espèce |
| `/support` | 3 | OK |
| `/assistant` | 2 | + LLM ou renommage |

### 5.2 Contrat d'erreurs unifié

Toutes les erreurs API retournent :

```json
{
  "detail": "Message lisible",
  "code": "PERMISSION_DENIED",
  "field": "statut",
  "timestamp": "2026-09-01T16:00:00Z"
}
```

Codes standardisés : `VALIDATION_ERROR`, `NOT_FOUND`, `PERMISSION_DENIED`, `CONFLICT`, `SYNC_FAILED`, `ML_INFERENCE_ERROR`.

### 5.3 Versioning

- Breaking change → `/api/v2`
- Header `X-API-Version: 1` optionnel
- Dépréciation : 2 versions supportées simultanément

### 5.4 Nouveaux endpoints requis

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/auth/refresh` | Renouvellement token |
| `POST` | `/captures/{id}/analyser-image` | Inférence ML visuelle |
| `GET` | `/captures/stats-audio` | Métriques réelles (précision, rappel, F1) |
| `POST` | `/dhis2/sync/{capture_id}` | Sync unitaire capture → DHIS2 |
| `GET` | `/dhis2/conflicts` | Liste conflits de sync |
| `POST` | `/dhis2/conflicts/{id}/resolve` | Résolution conflit |
| `POST` | `/sync/replay/{item_id}` | Replay item file offline |
| `GET` | `/modeles/registry` | Liste artefacts versionnés |
| `POST` | `/modeles/{id}/rollback` | Rollback version précédente |
| `GET` | `/health` | Health check (DB, ML runtime, DHIS2 config) |
| `GET` | `/health/dhis2` | Test connexion DHIS2 réelle |

---

## 6. Spécifications Machine Learning & Audio

### 6.1 Pipeline audio production (cible 100 %)

#### 6.1.1 Dataset

| Exigence | Description |
|----------|-------------|
| DS-01 | Minimum **500 enregistrements terrain** étiquetés par espèce |
| DS-02 | Métadonnées : site, date, conditions (température, humidité), qualité |
| DS-03 | Split : 70 % train / 15 % validation / 15 % test (stratifié par espèce) |
| DS-04 | Augmentation : bruit gaussien, time-stretch, pitch-shift |
| DS-05 | Formats supportés : WAV, MP3, OGG, M4A |

#### 6.1.2 Modèle

| Exigence | Description |
|----------|-------------|
| MOD-01 | Architecture : CNN sur mel-spectrogrammes (128 bins, 16 kHz, fenêtre 25 ms) |
| MOD-02 | Classes : 5 espèces cibles + classe `inconnu` (rejet si confiance < seuil) |
| MOD-03 | Export ONNX avec preprocessing intégré ou documenté |
| MOD-04 | Latence inférence < 500 ms sur CPU (fichier 5 sec) |
| MOD-05 | Versioning sémantique : `audio-cnn-v{major}.{minor}.{patch}` |

#### 6.1.3 Métriques d'acceptation ML

| Métrique | Seuil minimum |
|----------|--------------|
| Précision globale (test set) | ≥ 85 % |
| Rappel par espèce | ≥ 80 % chacune |
| F1-score macro | ≥ 0.82 |
| Taux de rejet « inconnu » | < 10 % sur données valides |
| Faux positifs cross-espèce | < 5 % |

#### 6.1.4 Remplacement du classifieur heuristique

Fichier `audio_classifier.py` — logique cible :

1. Charger audio (ffmpeg si non-WAV)
2. Preprocessing identique au training (mel-spec, normalisation)
3. Inférence ONNX si modèle déployé
4. Fallback feature-based **uniquement** si pas de modèle déployé (avec warning dans metadata)
5. Retourner résultat structuré + flag `mode=inference|fallback`

### 6.2 Pipeline ML visuel (cible 100 %)

| Exigence | Description |
|----------|-------------|
| IMG-01 | Service `image_classifier.py` — inférence sur `specimen_image` |
| IMG-02 | Architecture : MobileNetV3 ou EfficientNet fine-tuné |
| IMG-03 | Endpoint `POST /captures/{id}/analyser-image` |
| IMG-04 | UI `gestion-modeles-visuels.js` — afficher résultats + bbox si détection |
| IMG-05 | Métriques : mAP ≥ 0.80 sur test set images |

### 6.3 Modèle de risque épidémiologique (cible 100 %)

| Exigence | Description |
|----------|-------------|
| RISK-01 | Calibration β/γ sur données historiques régionales |
| RISK-02 | Paramètres configurables via `config-modeles-risque.html` |
| RISK-03 | Export prévisions CSV pour rapports OMS |
| RISK-04 | Intervalles de confiance sur les projections |
| RISK-05 | Documentation des hypothèses du modèle SEIR |

### 6.4 Évaluation et monitoring

| Exigence | Description |
|----------|-------------|
| EVAL-01 | Endpoint `GET /modeles/{id}/evaluation` — matrice de confusion JSON |
| EVAL-02 | Dashboard pipelines affiche métriques réelles (pas simulées) |
| EVAL-03 | Drift detection : alerte si précision glissante < seuil sur 30 jours |
| EVAL-04 | Tests avec fixtures WAV **réels** (pas seulement sinusoïdes) |

---

## 7. Spécifications DHIS2 & Synchronisation

### 7.1 Client DHIS2 (cible 100 %)

| Exigence | Description |
|----------|-------------|
| DHIS-01 | Test connexion via `GET /health/dhis2` (ping API DHIS2, pas seulement backend) |
| DHIS-02 | Credentials chiffrés Fernet (déjà en place — conserver) |
| DHIS-03 | Mappings configurables : indicateur Entomo → dataElement DHIS2 |
| DHIS-04 | Sync unitaire : 1 capture validée → 1 dataValueSet |
| DHIS-05 | Sync batch : agrégats par site/période |
| DHIS-06 | Retry exponentiel : 3 tentatives, backoff 2^n secondes |
| DHIS-07 | Historique complet : `DHIS2Sync` avec payload, réponse, durée, erreur |

### 7.2 Gestion des conflits

| Scénario | Comportement |
|----------|-------------|
| Capture modifiée après sync | Flag `conflit=true`, UI résolution dans `statut-sync.html` |
| DHIS2 indisponible | File offline, retry automatique |
| Mapping invalide | Erreur explicite + suggestion de correction |
| Doublon dataValueSet | Idempotence via `client_id` unique |

### 7.3 File de synchronisation (backend + frontend)

#### Backend `offline_queue`

| Exigence | Description |
|----------|-------------|
| SYNC-01 | Support `resource_type` : `capture`, `intervention`, `dhis2_push`, `site` |
| SYNC-02 | Actions : `create`, `update`, `delete`, `sync` |
| SYNC-03 | Replay idempotent via `client_id` UUID |
| SYNC-04 | Statuts : `pending → processing → completed → failed → dead_letter` |
| SYNC-05 | Endpoint `POST /sync/process` traite par batch (max 50 items) |
| SYNC-06 | Dead letter queue consultable + retry manuel |

#### Frontend `offline-store.js` + `offline-sync.js`

| Exigence | Description |
|----------|-------------|
| OFF-01 | Queue étendue : create/update capture, validation, sync DHIS2 |
| OFF-02 | `client_id` UUID généré à la création locale |
| OFF-03 | Indicateur visuel : badge « X en attente » dans header |
| OFF-04 | Sync auto à reconnexion + intervalle configurable |
| OFF-05 | Mode Wi-Fi only respecté |
| OFF-06 | Limite stockage (`stockage_max`) appliquée — purge LRU |

### 7.4 Contrat de données sync (frontend ↔ backend)

```json
{
  "client_id": "uuid-v4",
  "resource_type": "capture",
  "action": "create",
  "payload": { /* CaptureCreate schema */ },
  "created_at_local": "2026-09-01T10:00:00Z",
  "retry_count": 0,
  "priority": 1
}
```

Réponse serveur :

```json
{
  "client_id": "uuid-v4",
  "server_id": 42,
  "status": "completed",
  "synced_at": "2026-09-01T10:00:05Z"
}
```

---

## 8. Spécifications Mode hors-ligne & PWA

### 8.1 Service Worker (cible 100 %)

| Exigence | Description |
|----------|-------------|
| PWA-01 | Precache : toutes les pages HTML, JS, CSS, fonts, icônes (~60 assets) |
| PWA-02 | Stratégie pages : **cache-first, network-fallback** |
| PWA-03 | Stratégie API GET : **stale-while-revalidate** (cache 5 min) |
| PWA-04 | Mutations POST/PUT/DELETE : **network-only** avec fallback queue offline |
| PWA-05 | Bypass SW pour `/api/` mutations |
| PWA-06 | Versioning cache : `CACHE_VERSION` bump → purge ancien cache |
| PWA-07 | Page offline fallback : `pages/offline.html` |

### 8.2 Manifest PWA

| Exigence | Description |
|----------|-------------|
| MAN-01 | Icônes PNG : 72, 96, 128, 144, 152, 192, 384, 512 px |
| MAN-02 | `theme_color` et `background_color` cohérents design system |
| MAN-03 | `shortcuts` : Nouvelle capture, Sync, Dashboard |
| MAN-04 | `screenshots` pour install prompt |

### 8.3 Cache lecture API (IndexedDB)

| Store | Contenu | TTL |
|-------|---------|-----|
| `captures` | Dernières 500 captures | 24 h |
| `sites` | Tous les sites actifs | 48 h |
| `reference` | Données de référence | 7 jours |
| `dashboard` | Agrégats dashboard | 1 h |
| `sync_queue` | File locale | Permanent jusqu'à sync |

### 8.4 Tailwind & assets locaux

| Exigence | Description |
|----------|-------------|
| CSS-01 | `npm run build:css` produit `www/css/dist/tailwind.min.css` |
| CSS-02 | Supprimer `<script src="cdn.tailwindcss.com">` de toutes les pages |
| CSS-03 | Google Fonts : télécharger et servir localement (`assets/fonts/`) |
| CSS-04 | Material Symbols : subset local ou SVG inline |

---

## 9. Spécifications Frontend & UI/UX

### 9.1 Design System (cible 100 %)

#### 9.1.1 Tokens de design

| Token | Valeur | Usage |
|-------|--------|-------|
| `--color-primary` | `#005689` | Actions principales, liens |
| `--color-primary-dark` | `#003d61` | Hover, sidebar active |
| `--color-accent` | `#E8A317` | Alertes, badges |
| `--color-success` | `#16A34A` | Validations, sync OK |
| `--color-danger` | `#DC2626` | Erreurs, rejets |
| `--color-warning` | `#F59E0B` | En attente, conflits |
| `--font-sans` | `Inter, system-ui` | Corps de texte |
| `--radius-card` | `1rem` | Cartes, modales |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.1)` | Élévation standard |

#### 9.1.2 Composants réutilisables à créer

| Composant | Fichier | Remplace |
|-----------|---------|----------|
| `Avatar` | `components/avatar.js` | URLs Google hardcodées |
| `Sidebar` | `components/sidebar.html` | Sidebar dupliquée dans chaque page |
| `Header` | `components/header.html` | Header dupliqué |
| `DataTable` | `components/data-table.js` | Tables ad-hoc |
| `Modal` | `components/modal.js` | Modales inline |
| `Toast` | `components/toast.js` | `pushNotification()` dispersé |
| `EmptyState` | `components/empty-state.js` | Messages vides inconsistants |
| `LoadingSkeleton` | `components/skeleton.js` | Spinners inconsistants |
| `StatusBadge` | `components/badge.js` | Badges statut ad-hoc |
| `ImageFallback` | `components/image-fallback.js` | Images cassées |

#### 9.1.3 Règles UI/UX obligatoires

| Règle | Description |
|-------|-------------|
| UX-01 | **États vides** : chaque liste affiche illustration + CTA si vide |
| UX-02 | **États chargement** : skeleton sur toutes les tables et cartes |
| UX-03 | **États erreur** : message + bouton « Réessayer » |
| UX-04 | **Feedback action** : toast succès/erreur sur chaque mutation |
| UX-05 | **Responsive** : mobile-first, breakpoints sm/md/lg/xl |
| UX-06 | **Dark mode** : cohérent sur toutes les pages (déjà partiel) |
| UX-07 | **Accessibilité** : focus visible, aria-labels, contraste ≥ 4.5:1 |
| UX-08 | **Navigation** : breadcrumb sur pages détail |
| UX-09 | **Confirmations** : modale avant suppression/rejet/sync massive |
| UX-10 | **Pagination** : toutes les listes > 20 items paginées |

### 9.2 Politique assets & images (zéro casse)

| Règle | Description |
|-------|-------------|
| IMG-R01 | **Interdiction** d'URLs externes (Google, placeholder.com) en production |
| IMG-R02 | Avatars : initiales utilisateur sur fond coloré (hash du nom) |
| IMG-R03 | Images spécimens : servies via `/uploads/` avec fallback icône `pest_control` |
| IMG-R04 | Cartes/maps : tuiles OpenStreetMap avec fallback message si offline |
| IMG-R05 | Icônes : Material Symbols local ou SVG sprite `assets/icons.svg` |
| IMG-R06 | Logo : `assets/logo-entomo.svg` (vectoriel, toutes tailles) |
| IMG-R07 | Test automatisé : `test_no_external_images.py` — scan HTML/JS pour URLs http externes |
| IMG-R08 | `onerror` handler sur toutes les balises `<img>` dynamiques |

### 9.3 Refonte pages prioritaires (UX critique)

| Page | Améliorations requises |
|------|----------------------|
| `index.html` | Sidebar composant, avatar local, indicateur sync header |
| `dashboard-entomo.html` | Graphiques interactifs, drill-down, refresh auto |
| `gestion-captures.html` | Image fallback, pagination, filtres avancés |
| `surveillance-audio.html` | Waveform, spectrogramme, export réel, upload micro |
| `validation-dhis2.html` | Preview dataValueSet, résolution conflits inline |
| `gestion-hors-ligne.html` | Timeline sync, détail erreurs, retry unitaire |
| `assistant.html` | Historique session, markdown rendering, widget header |
| `details-gite.html` | Fiche complète (actuellement minimal) |
| `cartographie.html` | Clustering, légende, filtres temps réel |
| `audit-logs.html` | Filtres action/utilisateur/date, export |

### 9.4 Suppression des fallbacks factices

| Fichier | Action |
|---------|--------|
| `pages-generiques.js` | **Supprimer** ou renommer `demo-mode.js` avec banner « Mode démo » |
| `surveillance-audio.js` | Implémenter export CSV/JSON réel |
| `core.js` (notifications header) | Brancher `apiNotifications` |
| `dashboard-sync-dhis2.js` | `config_id` dynamique |
| `gestion-captures.js` | Vérifier URL image via helper `resolveImageUrl()` |

---

## 10. Matrice pages ↔ API ↔ données

### 10.1 Inventaire des 43 écrans applicatifs

| # | Page HTML | Module JS | API principales | Permissions | Statut cible |
|---|-----------|-----------|-----------------|-------------|--------------|
| 1 | `dashboard-entomo.html` | `dashboard-entomo.js` | `/dashboard/*` | `dashboard:voir` | 100 % |
| 2 | `dashboard-entomo-region5.html` | `dashboard-entomo-region5.js` | `/dashboard/*?region=` | `dashboard:voir` | 100 % |
| 3 | `dashboard-utilisateurs.html` | `dashboard-utilisateurs.js` | `/users/`, `/auth/activity` | `users:voir` | 100 % |
| 4 | `dashboard-rapports-oms.html` | `dashboard-rapports-oms.js` | `/rapports/`, `/dashboard/` | `rapports:voir` | 100 % |
| 5 | `dashboard-sync-dhis2.html` | `dashboard-sync-dhis2.js` | `/dhis2/sync`, `/dhis2/history` | `dhis2:gestion` | 100 % |
| 6 | `gestion-captures.html` | `gestion-captures.js` | `/captures/` | `captures:voir` | 100 % |
| 7 | `nouvelle-capture.html` | `creation-entite.js` | `POST /captures/` | `captures:creer` | 100 % |
| 8 | `details-capture.html` | `details-capture.js` | `/captures/{id}` | `captures:voir` | 100 % |
| 9 | `gestion-sites.html` | `gestion-sites.js` | `/sites/` | `sites:voir` | 100 % |
| 10 | `nouveau-site.html` | `creation-entite.js` | `POST /sites/` | `sites:creer` | 100 % |
| 11 | `details-site.html` | `details-site.js` | `/sites/{id}` | `sites:voir` | 100 % |
| 12 | `details-gite.html` | `details-gite.js` | `/sites/{id}` (enrichi) | `sites:voir` | 100 % |
| 13 | `interventions.html` | `interventions.js` | `/interventions/` | `interventions:gestion` | 100 % |
| 14 | `nouvelle-intervention.html` | `creation-entite.js` | `POST /interventions/` | `interventions:gestion` | 100 % |
| 15 | `campagnes.html` | `campagnes.js` | `/campagnes/` | `campagnes:gestion` | 100 % |
| 16 | `nouvelle-campagne.html` | `creation-entite.js` | `POST /campagnes/` | `campagnes:gestion` | 100 % |
| 17 | `gestion-datasets.html` | `gestion-datasets.js` | `/datasets/` | `datasets:gestion` | 100 % |
| 18 | `nouveau-dataset.html` | `creation-entite.js` | `POST /datasets/` | `datasets:gestion` | 100 % |
| 19 | `details-dataset.html` | `details-dataset.js` | `/datasets/{id}` | `datasets:gestion` | 100 % |
| 20 | `import-donnees.html` | `import-donnees.js` | `POST /import/` | `datasets:gestion` | 100 % |
| 21 | `analyse-donnees.html` | `analyse-donnees.js` | `/captures/`, `/dashboard/` | `captures:voir` | 100 % |
| 22 | `gestion-hors-ligne.html` | `gestion-hors-ligne.js` | `/sync/`, OfflineStore | `sync:gestion` | 100 % |
| 23 | `catalogue-modeles.html` | `catalogue-modeles.js` | `/modeles/` | `modeles:gestion` | 100 % |
| 24 | `details-modele.html` | `details-modele.js` | `/modeles/{id}` | `modeles:gestion` | 100 % |
| 25 | `gestion-modeles-visuels.html` | `gestion-modeles-visuels.js` | `/modeles/`, analyse image | `modeles:gestion` | 100 % |
| 26 | `surveillance-audio.html` | `surveillance-audio.js` | `/captures/analyser`, stats | `modeles:gestion` | 100 % |
| 27 | `dashboard-pipelines-1.html` | `dashboard-pipelines-1.js` | `/modeles/pipelines/` | `modeles:gestion` | 100 % |
| 28 | `dashboard-pipelines-4.html` | `dashboard-pipelines-4.js` | `/modeles/pipelines/` | `modeles:gestion` | 100 % |
| 29 | `details-pipeline.html` | `details-pipeline.js` | `/modeles/pipelines/{id}` | `modeles:gestion` | 100 % |
| 30 | `config-modeles-risque.html` | `config-modeles-risque.js` | `/modeles/risque/` | `modeles:gestion` | 100 % |
| 31 | `cartographie.html` | `cartographie.js` | `/cartographie/` | `sites:voir` | 100 % |
| 32 | `generateur-rapports.html` | `generateur-rapports.js` | `/rapports/` | `rapports:creer` | 100 % |
| 33 | `details-rapport.html` | `details-rapport.js` | `/rapports/{id}` | `rapports:voir` | 100 % |
| 34 | `alertes.html` | `alertes.js` | `/notifications/` | `notifications:gestion` | 100 % |
| 35 | `gestion-utilisateurs.html` | `gestion-utilisateurs.js` | `/users/` | `users:voir` | 100 % |
| 36 | `nouvel-utilisateur.html` | `creation-entite.js` | `POST /users/` | `users:creer` | 100 % |
| 37 | `gestion-roles.html` | `gestion-roles.js` | `/roles/` | `roles:voir` | 100 % |
| 38 | `audit-logs.html` | `audit-logs.js` | `/audit/` | `audit:voir` | 100 % |
| 39 | `config-dhis2.html` | `config-dhis2.js` | `/dhis2/config`, mappings | `dhis2:gestion` | 100 % |
| 40 | `validation-dhis2.html` | `validation-dhis2.js` | `/captures/`, `/dhis2/push` | `captures:valider` | 100 % |
| 41 | `config-indicateurs.html` | `config-indicateurs.js` | `/indicateurs/` | `indicateurs:gestion` | 100 % |
| 42 | `param-sync.html` | `param-sync.js` | `/sync/preferences` | `sync:gestion` | 100 % |
| 43 | `statut-sync.html` | `statut-sync.js` | `/sync/status`, conflits | `sync:gestion` | 100 % |
| 44 | `param-langues.html` | `param-langues.js` | `/langues/` | `langues:gestion` | 100 % |
| 45 | `profil.html` | `profil.js` | `/auth/me` | (auth) | 100 % |
| 46 | `parametres-compte.html` | `parametres-compte.js` | `/auth/password` | (auth) | 100 % |
| 47 | `assistant.html` | `assistant.js` | `/assistant/chat` | `dashboard:voir` | 100 % |
| 48 | `aide.html` | `aide.js` | `/support/` | (auth) | 100 % |
| 49 | `centre-application.html` | `centre-application.js` | (navigation) | (auth) | 100 % |
| 50 | `login.html` | (inline) | `POST /auth/login` | (public) | 100 % |

### 10.2 Flux de données critiques (séquences)

#### Flux 1 : Capture terrain → validation → DHIS2

```
Agent terrain                Frontend                    Backend                  DHIS2
     │                          │                          │                       │
     │── Enregistrer capture ──▶│                          │                       │
     │                          │── POST /captures/ ──────▶│── INSERT capture       │
     │                          │◀── 201 {id, client_id} ──│                       │
     │                          │                          │                       │
     │── Upload audio ─────────▶│── POST upload-audio ────▶│── save file            │
     │                          │── POST /analyser ───────▶│── ML inference         │
     │                          │◀── audio_metadata ───────│                       │
     │                          │                          │                       │
     │  [si offline]            │── OfflineStore.enqueue ─▶│ (local IDB)            │
     │                          │                          │                       │
     │── Valider ──────────────▶│── PUT /valider ─────────▶│── statut=valide       │
     │                          │                          │── AuditLog             │
     │                          │── POST /dhis2/push ─────▶│── HTTP dataValueSet ──▶│
     │                          │◀── sync result ──────────│◀── 200 OK ────────────│
```

#### Flux 2 : Offline → reconnexion → sync

```
Frontend (offline)              Frontend (online)              Backend
     │                               │                          │
     │── create capture local ──────▶│                          │
     │   (IndexedDB queue)           │                          │
     │                               │── detect online ────────▶│
     │                               │── flush queue ──────────▶│── process items
     │                               │◀── mapping client_id ────│    (idempotent)
     │                               │── update local IDs ─────▶│
```

---

## 11. Sécurité, permissions & audit

### 11.1 Matrice RBAC complète

| Rôle | Permissions |
|------|------------|
| `agent_terrain` | `captures:creer`, `captures:voir`, `sites:voir` |
| `technicien_lab` | + `captures:valider`, `modeles:gestion` |
| `superviseur` | + `dashboard:voir`, `rapports:voir`, `interventions:gestion` |
| `admin_dhis2` | + `dhis2:gestion`, `dhis2:sync`, `sync:gestion` |
| `admin_system` | + `users:voir`, `roles:voir`, `audit:voir`, `admin` |
| `superuser` | Toutes |

### 11.2 Sécurité applicative

| Exigence | Description |
|----------|-------------|
| SEC-01 | HTTPS obligatoire en production |
| SEC-02 | CORS restreint aux origines configurées |
| SEC-03 | Validation MIME sur tous les uploads |
| SEC-04 | Taille max upload : 10 Mo image, 50 Mo audio |
| SEC-05 | Sanitization des entrées utilisateur (XSS) |
| SEC-06 | Headers sécurité : `X-Content-Type-Options`, `X-Frame-Options`, CSP |
| SEC-07 | Secrets en variables d'environnement (`.env` jamais commité) |
| SEC-08 | Rotation clé Fernet DHIS2 documentée |

---

## 12. Stratégie de tests (intégration & E2E)

### 12.1 Pyramide de tests cible

```
                    ┌─────────┐
                    │ E2E UI  │  ~120 tests Playwright
                    │ (frontend)│
                   ┌┴─────────┴┐
                   │ E2E API   │  ~40 tests scénarios complets
                   │ (backend) │
                  ┌┴───────────┴┐
                  │ Intégration │  ~80 tests cross-module
                  │             │
                 ┌┴─────────────┴┐
                 │ Unitaires     │  ~200 tests services/CRUD
                 │               │
                 └───────────────┘
                 TOTAL CIBLE : ~440 tests
```

### 12.2 Tests backend à créer

| Fichier test | Scénarios | Priorité |
|-------------|-----------|----------|
| `test_permissions_enforcement.py` | 403 sur chaque module sans permission | P0 |
| `test_audit_writes.py` | Login, validation, sync → logs créés | P0 |
| `test_audio_real_inference.py` | Inférence ONNX sur fixtures réelles | P0 |
| `test_image_classifier.py` | Inférence image sur specimen test | P0 |
| `test_ml_training_pipeline.py` | Pipeline complet dataset → modèle → deploy | P0 |
| `test_dhis2_granular_sync.py` | Sync 1 capture → dataValueSet mock | P0 |
| `test_dhis2_conflicts.py` | Détection et résolution conflits | P1 |
| `test_offline_queue_replay.py` | Replay idempotent par resource_type | P0 |
| `test_report_scheduler.py` | Exécution programmée rapport | P1 |
| `test_campagnes.py` | CRUD campagnes | P1 |
| `test_interventions.py` | CRUD interventions | P1 |
| `test_reference.py` | Endpoints référence | P2 |
| `test_health_endpoints.py` | /health, /health/dhis2 | P1 |
| `test_postgres_migrations.py` | Alembic up/down sur PostgreSQL | P0 |
| `integration/test_capture_to_dhis2.py` | Flux complet capture → DHIS2 | P0 |
| `integration/test_offline_sync.py` | File → process → verify | P0 |
| `e2e/test_full_workflow.py` | Scénario agent terrain complet | P0 |

### 12.3 Tests frontend E2E à créer (Playwright)

| Fichier test | Scénarios | Priorité |
|-------------|-----------|----------|
| `test_e2e_capture_workflow.py` | Créer → upload → analyser → valider | P0 |
| `test_e2e_dhis2_validation.py` | Valider capture → push DHIS2 → historique | P0 |
| `test_e2e_offline_capture.py` | Créer offline → reconnect → sync | P0 |
| `test_e2e_audio_analysis.py` | Upload WAV → analyser → voir résultats | P0 |
| `test_e2e_assistant_chat.py` | Envoyer message → recevoir réponse | P1 |
| `test_e2e_permissions_ui.py` | Rôle limité → pages masquées + 403 API | P0 |
| `test_e2e_report_generation.py` | Générer PDF → télécharger | P1 |
| `test_e2e_sync_conflicts.py` | Afficher conflit → résoudre | P1 |
| `test_e2e_pwa_offline.py` | Installer PWA → naviguer offline | P1 |
| `test_no_broken_images.py` | Scan toutes pages → 0 image 404 | P0 |
| `test_no_external_cdn.py` | 0 référence tailwind CDN en prod build | P0 |
| `test_visual_regression.py` | Screenshots 10 pages clés vs baseline | P2 |
| `test_e2e_ml_pipeline.py` | Lancer pipeline → voir métriques | P1 |
| `test_e2e_cartography.py` | Carte charge → markers visibles | P2 |
| `test_e2e_audit_logs.py` | Action → log visible dans audit | P1 |

### 12.4 Tests de non-régression sync données

| Test | Vérifie |
|------|---------|
| `test_data_contract_captures.py` | Schéma frontend `CaptureCreate` = schéma backend |
| `test_data_contract_dhis2.py` | Mapping frontend = mapping backend |
| `test_data_contract_offline.py` | Format queue IDB = format API `/sync/` |
| `test_data_contract_permissions.py` | Permissions frontend `PermissionGuard` = backend RBAC |

### 12.5 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - run: pip install -r backend/requirements.txt
      - run: alembic upgrade head
      - run: pytest backend/ --cov=app --cov-fail-under=80
  frontend:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm run build:css
      - run: pytest frontend/tests/ -x
      - run: npx playwright test
  lint:
    steps:
      - run: ruff check backend/
      - run: npx htmlhint frontend/www/
```

### 12.6 Critères de couverture

| Couche | Couverture minimum |
|--------|-------------------|
| Backend services | 85 % |
| Backend endpoints | 90 % |
| Frontend E2E (pages) | 100 % des 50 pages chargent |
| Frontend E2E (flux métier) | 100 % des 5 flux critiques |
| ML pipeline | 1 run complet en CI avec fixtures |

---

## 13. Plan de livraison par phases

### Phase 1 — Fondations & sécurité (Semaines 1–3)

| Tâche | Livrable | % impact |
|-------|----------|----------|
| Permissions RBAC backend | Middleware sur tous endpoints | Backend +15 % |
| Audit service + hooks | Logs sur actions sensibles | Backend +5 % |
| Alembic migration initiale | PostgreSQL ready | Backend +5 % |
| Suppression fallbacks factices | `pages-generiques.js` retiré | Frontend +5 % |
| Design system tokens + composants | Avatar, Sidebar, Toast | Frontend +10 % |
| Assets locaux | Zéro CDN externe | Frontend +5 % |
| Tests permissions + audit | 30 nouveaux tests | Tests +10 % |

**Jalon Phase 1 :** Backend 90 %, Sécurité 90 %, UI assets 85 %

### Phase 2 — Synchronisation & offline (Semaines 4–6)

| Tâche | Livrable | % impact |
|-------|----------|----------|
| Offline queue étendue (FE+BE) | 4 resource_types | Offline +20 % |
| SW precache complet | 60 assets cached | PWA +15 % |
| Cache lecture IndexedDB | 4 stores | Offline +10 % |
| DHIS2 sync granulaire | 1 capture = 1 push | DHIS2 +15 % |
| Gestion conflits UI+API | Résolution inline | DHIS2 +10 % |
| Tests E2E offline + DHIS2 | 20 nouveaux tests | Tests +10 % |

**Jalon Phase 2 :** Offline 90 %, DHIS2 95 %, Sync 95 %

### Phase 3 — Machine Learning production (Semaines 7–10)

| Tâche | Livrable | % impact |
|-------|----------|----------|
| Dataset terrain (ou synthétique avancé) | 500+ samples | ML +20 % |
| Entraînement CNN audio | Modèle ONNX v1 | ML +25 % |
| Remplacement classifieur | Inference ONNX | Audio +30 % |
| Pipeline training réel | `ml_training.py` | ML +15 % |
| Inférence image | `image_classifier.py` | ML visuel +60 % |
| Métriques honnêtes | Précision/rappel/F1 | ML +10 % |
| Tests ML + fixtures réelles | 25 nouveaux tests | Tests +5 % |

**Jalon Phase 3 :** ML 90 %, Audio 90 %

### Phase 4 — UI/UX polish & assistant (Semaines 11–13)

| Tâche | Livrable | % impact |
|-------|----------|----------|
| Refonte 10 pages prioritaires | UX patterns uniformes | Frontend +10 % |
| Waveform + spectrogramme audio | Canvas/Web Audio API | Audio UI +10 % |
| Export audio CSV/JSON | Fichier téléchargeable | Audio UI +5 % |
| Assistant LLM (ou renommage) | OpenAI/Ollama intégration | Assistant +40 % |
| Notifications header branchées | API réelle | Frontend +3 % |
| Scheduler rapports | APScheduler | Backend +5 % |
| Tests E2E complets | 120+ tests frontend | Tests +15 % |

**Jalon Phase 4 :** Frontend 98 %, Assistant 90 %

### Phase 5 — Production & validation finale (Semaines 14–16)

| Tâche | Livrable | % impact |
|-------|----------|----------|
| Déploiement PostgreSQL | Docker Compose prod | Prod ready |
| CI/CD complet | GitHub Actions | Qualité |
| Tests de charge | 100 users concurrent | Performance |
| Documentation runbooks | `docs/runbooks/` | Ops |
| Audit sécurité | Scan OWASP | Sécurité +10 % |
| Tests E2E 5 flux critiques | 100 % verts | Validation |
| UAT terrain | Pilote 5 agents | Validation métier |

**Jalon Phase 5 :** **100 % tous domaines**

---

## 14. Critères d'acceptation globaux (Definition of Done)

### 14.1 Definition of Done — par fonctionnalité

Une fonctionnalité est **100 % terminée** si et seulement si :

- [ ] Code implémenté backend + frontend
- [ ] Permissions RBAC appliquées côté serveur
- [ ] Action auditée si sensible
- [ ] Tests unitaires backend (≥ 1 par endpoint)
- [ ] Test d'intégration cross-module si applicable
- [ ] Test E2E Playwright si UI impliquée
- [ ] Documentation OpenAPI à jour
- [ ] États UI : chargement, vide, erreur, succès
- [ ] Responsive mobile vérifié
- [ ] Dark mode vérifié
- [ ] Zéro asset externe cassé
- [ ] Fonctionne offline (si applicable)
- [ ] Review code approuvée

### 14.2 Checklist validation globale 100 %

#### Backend
- [ ] 300+ tests passants
- [ ] Couverture ≥ 80 %
- [ ] PostgreSQL migrations complètes
- [ ] Permissions sur 100 % des endpoints protégés
- [ ] Audit sur 100 % des actions sensibles
- [ ] 0 endpoint stub/mock

#### Frontend
- [ ] 120+ tests E2E passants
- [ ] 50/50 pages fonctionnelles avec données réelles
- [ ] 0 référence CDN externe (Tailwind, fonts, images)
- [ ] 0 action UI factice
- [ ] Design system appliqué sur toutes les pages
- [ ] PWA installable avec icônes PNG

#### ML & Audio
- [ ] Modèle ONNX versionné dans registry
- [ ] Précision ≥ 85 % sur test set
- [ ] Pipeline training produit artefact utilisable
- [ ] Inférence image opérationnelle
- [ ] Métriques honnêtes affichées

#### DHIS2 & Sync
- [ ] Sync unitaire capture → DHIS2
- [ ] Conflits détectés et résolvables
- [ ] File offline 4 resource types
- [ ] Replay idempotent testé
- [ ] Test connexion DHIS2 réel (pas /health)

#### Sécurité
- [ ] Scan OWASP sans critique
- [ ] HTTPS en production
- [ ] Validation uploads active
- [ ] Secrets hors repo

---

## 15. Annexes

### Annexe A — Variables d'environnement production

```env
DATABASE_URL=postgresql://user:pass@host:5432/entomo
SECRET_KEY=<random-64-chars>
FERNET_KEY=<fernet-key>
DHIS2_DEFAULT_URL=https://dhis2.health.gov.xx
CORS_ORIGINS=https://entomo.health.gov.xx
ML_MODELS_PATH=/app/models_registry
FFMPEG_PATH=/usr/bin/ffmpeg
ASSISTANT_LLM_URL=https://api.openai.com/v1  # ou Ollama local
ASSISTANT_LLM_KEY=<key>
SCHEDULER_ENABLED=true
ENVIRONMENT=production
```

### Annexe B — Permissions complètes (référence)

```
dashboard:voir, captures:voir, captures:creer, captures:valider, captures:exporter,
sites:voir, sites:creer, sites:modifier,
datasets:gestion, modeles:gestion,
dhis2:gestion, dhis2:sync,
rapports:voir, rapports:creer,
interventions:gestion, campagnes:gestion,
users:voir, users:creer, users:modifier,
roles:voir, roles:gestion,
sync:gestion, notifications:gestion,
indicateurs:gestion, langues:gestion,
audit:voir, admin
```

### Annexe C — Flux critiques (5 scénarios E2E obligatoires)

1. **Agent terrain** : Login → Nouvelle capture → Upload audio → Analyse → Sync
2. **Technicien lab** : Login → Liste captures → Valider → Push DHIS2 → Vérifier historique
3. **Mode offline** : Login → Créer capture offline → Couper réseau → Reconnecter → Vérifier sync
4. **Admin ML** : Login → Import modèle → Lancer pipeline → Déployer → Tester inférence
5. **Superviseur** : Login → Dashboard → Générer rapport PDF → Télécharger

### Annexe D — Mapping fichiers à modifier (référence rapide)

| Priorité | Fichier | Modification |
|----------|---------|-------------|
| P0 | `backend/app/core/permissions.py` | Ajouter `require_permission()` |
| P0 | Tous `backend/app/api/v1/endpoints/*.py` | Appliquer permissions |
| P0 | `backend/app/services/audit_service.py` | Créer |
| P0 | `backend/app/services/audio_classifier.py` | ONNX inference |
| P0 | `backend/app/services/pipeline_runner.py` | Vrai training |
| P0 | `backend/app/services/image_classifier.py` | Créer |
| P0 | `frontend/www/js/pages-generiques.js` | Supprimer |
| P0 | `frontend/www/js/core.js` | Notifications API, avatar local |
| P0 | `frontend/www/sw.js` | Precache complet |
| P0 | `frontend/www/js/offline-sync.js` | Queue étendue |
| P0 | Toutes pages HTML | Remplacer CDN Tailwind + avatars |
| P1 | `frontend/package.json` | Build Tailwind |
| P1 | `backend/alembic/versions/0001_initial.py` | Migration complète |
| P1 | `.github/workflows/ci.yml` | CI pipeline |

---

## Signature & validation

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Product Owner | | | |
| Lead Backend | | | |
| Lead Frontend | | | |
| Lead ML | | | |
| QA Lead | | | |

---

*Ce document constitue la référence unique pour atteindre 100 % de fonctionnalité sur la plateforme Entomo. Toute déviation doit être documentée via un ADR (Architecture Decision Record) dans `docs/adr/`.*
