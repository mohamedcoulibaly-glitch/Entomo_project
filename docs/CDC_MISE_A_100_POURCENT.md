# Cahier des charges technique — Mise à 100 % Entomo

**Version :** 1.0  
**Date :** 2026-09-01  
**Objectif :** Porter chaque domaine du projet à 100 % fonctionnel, testé et prêt pour un déploiement sanitaire national.

---

## 1. Contexte et périmètre

Entomo est une plateforme de surveillance entomologique (moustiques vecteurs) combinant :
- saisie terrain (captures, sites, campagnes),
- classification ML audio/image,
- intégration DHIS2,
- synchronisation hors-ligne,
- rapports et tableaux de bord OMS.

**État initial (audit) :** socle logiciel ~75 %, ML/audio ~35 %, production ~50 %.

**Critère de complétion 100 % :** chaque phase a une checklist binaire ; aucune phase suivante commence tant que la précédente n’est entièrement validée (code + tests + CI).

---

## 2. Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│  Nginx (TLS) — frontend statique + reverse proxy            │
│  /          → frontend/www                                  │
│  /api/v1    → FastAPI (Uvicorn)                             │
│  /uploads   → FastAPI StaticFiles                           │
│  /health    → FastAPI health                                │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   PostgreSQL 16                  Volumes: uploads, models_registry
```

**Ports dev :** `start.py` — backend 8765, frontend 8766 (API_BASE auto-détecté).  
**Ports prod :** 443 (nginx) → api:8000, db:5432.

---

## 3. Phases de réalisation (séquentielles)

| Phase | Domaine | Cible 100 % | Critères d’acceptation |
|-------|---------|-------------|------------------------|
| **P1** | Infrastructure & fondations UI | Config API, médias, images, design tokens, Docker | Tests P1 verts, pas d’URL hardcodée, fallbacks image OK |
| **P2** | Frontend dynamique complet | Upload audio/image, carto Leaflet, i18n, formulaires | E2E création capture avec média, carto interactive |
| **P3** | ML & Audio | MFCC/mel, librosa, pipeline audio UI, modèles crédibles | Accuracy > 70 % sur jeu de test, enregistrement micro |
| **P4** | DHIS2 & synchronisation | Sync robuste, retry, UI statut temps réel | E2E sync + offline queue 100 % |
| **P5** | Sécurité & déploiement | Uploads validés, TLS, secrets, rate limit, observabilité | Security audit 0 critique, compose full-stack |
| **P6** | Tests intégration & E2E | Couverture complète CI | Tous tests E2E en CI, création capture bout-en-bout |

---

## 4. Phase 1 — Infrastructure & fondations UI (détail)

### 4.1 Configuration API dynamique

| Exigence | Spécification |
|----------|---------------|
| `API_BASE` | Résolution via `ENTOMO_API_BASE`, meta `entomo-api-base`, ou heuristique port/origine |
| Health check | Utiliser l’origine API résolue, pas `127.0.0.1` hardcodé |
| URLs médias | `resolveMediaUrl(path)` — chemins `/uploads/*` toujours valides |
| CORS | Frontend et API sur même origine en prod (nginx) |

### 4.2 Images et représentations

| Exigence | Spécification |
|----------|---------------|
| Fallback | Aucune image cassée visible — placeholder Material `broken_image` |
| Avatars | Composant `EntomoAvatar` — initiales, pas d’URL externes |
| CDN | Aucun `cdn.tailwindcss.com`, aucun `googleusercontent.com` |

### 4.3 Design system UI/UX

| Exigence | Spécification |
|----------|---------------|
| Tokens | `design-tokens.css` — couleurs, rayons, ombres, animations |
| Composants | Cartes, boutons, formulaires, toasts cohérents |
| Dark mode | `class` Tailwind, persistance `localStorage` |
| Accessibilité | Focus rings, `aria-label` sur actions iconiques |
| Animations | Entrées douces, pas de flash permission-guard |

### 4.4 Docker & déploiement

| Exigence | Spécification |
|----------|---------------|
| Services | `db`, `api`, `frontend` (nginx) |
| Volumes | `entomo_pgdata`, `entomo_uploads`, `entomo_models` |
| Healthchecks | db, api, frontend |
| `.env.example` | SECRET_KEY, CORS, ports documentés |

### 4.5 Tests Phase 1

- `test_phase1_infrastructure.py` — API_BASE, resolveMediaUrl, config-boot
- `test_phase1_assets.py` — assets locaux, pas CDN
- Régression : tous tests existants passent

---

## 5. Phase 2 — Frontend dynamique complet (détail)

### 5.1 Capture terrain avec médias

- Formulaire `nouvelle-capture.html` : upload image + enregistrement audio (`MediaRecorder`)
- `apiCaptures.uploadImage()`, `uploadAudio()` après création
- Méthode capture : select (visuelle, audio, piège, aspiration…)
- Bouton « Analyser maintenant » post-création si audio présent

### 5.2 Cartographie Leaflet

- Remplacement pseudo-carte CSS par Leaflet + tuiles OpenStreetMap
- Marqueurs sites avec couleur risque, popup détail, cluster
- Export GeoJSON (existant, maintenu)
- Filtre région, couches sites/captures/risque

### 5.3 Internationalisation (i18n)

- Fichiers JSON par langue (`frontend/www/i18n/fr.json`, `en.json`, …)
- `i18n.js` — `t(key)`, chargement langue utilisateur / `localStorage`
- Pages critiques traduites (login, dashboard, captures, navigation)

### 5.4 Dynamisme global

- Tous boutons d’action liés à handlers (pas de `href="#"` mort)
- Tables : recherche, tri, pagination API
- Modales : confirmation destructive, feedback loader
- `permission-guard.js` — chargé synchrone sur pages protégées

### 5.5 Tests Phase 2

- E2E : création capture + upload image
- E2E : cartographie affiche marqueurs
- Statique : pas de boutons orphelins

---

## 6. Phase 3 — ML & Audio (détail)

### 6.1 Preprocessing audio

| Exigence | Spécification |
|----------|---------------|
| Formats | WAV, MP3, OGG, FLAC via librosa/soundfile |
| Features | MFCC (13) + log-mel (64) = vecteur 77+ |
| Sample rate | 16 kHz, durée min 1 s, max 30 s |
| Alignement | Même pipeline entraînement ↔ inférence ↔ visualisation |

### 6.2 Modèles

| Exigence | Spécification |
|----------|---------------|
| Audio | RandomForest ou CNN léger sur features mel ; accuracy cible ≥ 70 % sur test set |
| Image | Entraînement sur captures réelles si ≥ 50 images labellisées |
| Fallback | Heuristique FFT documentée, jamais silencieuse si ONNX absent |
| Manifest | Métriques réelles, `onnx_file` obligatoire si déployé |
| UI entraînement | Pipelines audio + image dans `gestion-modeles-visuels.js` |

### 6.3 Parcours audio terrain

1. Enregistrer (micro) → 2. Upload → 3. Analyse API → 4. Affichage waveform/spectrogramme aligné → 5. Validation humaine → 6. Ré-entraînement

### 6.4 Tests Phase 3

- `test_audio_mfcc_pipeline.py`
- `test_upload_audio_formats.py`
- E2E : enregistrement simulé + analyse

---

## 7. Phase 4 — DHIS2 & synchronisation (détail)

### 7.1 DHIS2

- Config URL, credentials chiffrés, test connexion UI
- Mappings indicateurs ↔ dataElements
- Push dataValueSets avec retry (3 tentatives, backoff)
- Dashboard sync : statut temps réel, historique, erreurs détaillées
- Validation DHIS2 : workflow approuver/rejeter/révision

### 7.2 Synchronisation offline

- `OfflineStore` IndexedDB — captures, sites, mutations
- `offline-sync.js` — enqueue, flush à reconnexion, conflits
- UI `gestion-hors-ligne.html` — file, statut, forcer sync
- Service Worker — cache assets, pas d’API stale

### 7.3 Tests Phase 4

- `test_sync_e2e.py` étendu
- `test_dhis2_retry.py`
- E2E offline → online flush

---

## 8. Phase 5 — Sécurité & production (détail)

### 8.1 Sécurité

| Exigence | Spécification |
|----------|---------------|
| Uploads | `validate_upload_file` sur tous endpoints upload ; taille max 10 Mo audio, 5 Mo image |
| Auth | Mot de passe min 10 car., rate limit login 5/min/IP |
| Secrets | SECRET_KEY obligatoire en prod (pas default) |
| CORS | Origines explicites en prod |
| TLS | nginx cert (Let's Encrypt ou montage) |
| Health DHIS2 | Authentifié ou infos minimales |

### 8.2 Observabilité

- Logs structurés JSON (request_id, user_id)
- Endpoint `/health` enrichi (DB, models, disk)
- Métriques optionnelles Prometheus

### 8.3 Jobs async

- Pipelines ML : persistance état en DB, reprise après crash
- Report scheduler : configurable via env

### 8.4 Tests Phase 5

- `security_audit.py` — 0 critique
- `test_upload_validation.py`
- `test_rate_limit.py`

---

## 9. Phase 6 — Tests intégration & E2E complets

### 9.1 Backend

- 260+ tests, couverture endpoints critiques
- Tests charge : 50 req/s health, 10 uploads parallèles

### 9.2 Frontend

| Suite | Contenu |
|-------|---------|
| `test_frontend_e2e.py` | Navigation 50 pages, login, liens |
| `test_phase5_critical_flows.py` | 5 flux métier |
| `test_sync_e2e.py` | PWA, offline |
| `test_capture_media_e2e.py` | Capture + média + analyse |
| `test_cartographie_e2e.py` | Leaflet marqueurs |

### 9.3 CI

- Tous suites E2E dans `frontend-e2e` job
- Artefacts Playwright screenshots on failure
- Gate : merge bloqué si tests échouent

---

## 10. Non-fonctionnels globaux

| Critère | Cible |
|---------|-------|
| Temps réponse API (p95) | < 500 ms (hors ML) |
| Analyse audio | < 5 s pour fichier 10 s |
| Disponibilité | 99.5 % (prod) |
| Langues | FR obligatoire, EN + langues admin |
| Navigateurs | Chrome 100+, Firefox 100+, Edge 100+ |
| Mobile | Responsive, PWA installable |

---

## 11. Livrables par phase

1. Code source mergé
2. Tests verts localement et CI
3. Mise à jour ce CDC (statut phase)
4. Runbook si changement déploiement

---

## 12. Suivi d’avancement

| Phase | Statut | Date fin |
|-------|--------|----------|
| P1 Infrastructure & UI base | ✅ Terminé | 2026-09-01 |
| P2 Frontend dynamique | ✅ Terminé | 2026-09-01 |
| P3 ML & Audio | ✅ Terminé | 2026-09-01 |
| P4 DHIS2 & Sync | ✅ Terminé | 2026-09-01 |
| P5 Sécurité & Prod | ✅ Terminé | 2026-09-01 |
| P6 Tests E2E complets | ✅ Terminé | 2026-09-01 |

---

*Document vivant — mis à jour à chaque phase complétée.*
