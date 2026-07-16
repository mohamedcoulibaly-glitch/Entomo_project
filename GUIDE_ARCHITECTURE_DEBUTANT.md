# Comprendre facilement le projet Entomo

Ce document explique le projet comme si tu découvrais le backend, les API et les bases de données. Tu n'as pas besoin de tout mémoriser : retiens d'abord le trajet d'une donnée.

## 1. Le projet en une phrase

Entomo est une application de surveillance entomologique. Le navigateur affiche les pages, le backend applique les règles, et une base SQLite conserve les données (utilisateurs, sites, captures, rapports, etc.).

```text
Utilisateur
    ↓ clique sur une page
Frontend (HTML + JavaScript)
    ↓ requête HTTP / JSON
API FastAPI (routes)
    ↓ validation et règles
CRUD + SQLAlchemy
    ↓ requête SQL
Base SQLite : backend/entomo.db
    ↑ résultat
Le même chemin remonte jusqu'à la page
```

Une comparaison simple :

- le **frontend** est la salle d'un restaurant ;
- l'**API** est le serveur qui prend la commande ;
- le **backend** est la cuisine qui vérifie et prépare ;
- la **base de données** est le garde-manger ;
- le **JSON** est le bon de commande échangé entre la salle et la cuisine.

## 2. Les trois grandes parties

### Frontend

Le dossier `frontend/www/` contient ce que voit l'utilisateur :

- `index.html` et `login.html` : pages principales ;
- `pages/` : pages métier (captures, sites, campagnes...) ;
- `js/` : comportement des pages ;
- `js/api.js` : point central qui communique avec le backend.

Le frontend est ici en HTML et JavaScript simples. Par exemple, `apiSites.list()` appelle l'adresse `/api/v1/sites/` avec `fetch()`.

### Backend

Le dossier `backend/` contient une application Python basée sur **FastAPI**. Il reçoit les demandes HTTP, vérifie l'utilisateur et les données, exécute les règles, interroge SQLite puis renvoie généralement du JSON.

### Base de données

La base utilisée normalement est `backend/entomo.db`, car le serveur est lancé depuis le dossier `backend`. C'est une base **SQLite** : toute la base tient dans un fichier.

Attention : il existe aussi un fichier `entomo.db` à la racine. Le chemin configuré est relatif (`sqlite:///./entomo.db`) ; la base choisie dépend donc du dossier depuis lequel le backend est lancé. Avec `python start.py`, c'est bien `backend/entomo.db`.

## 3. La carte des dossiers du backend

```text
backend/
├── main.py                 démarrage et configuration de FastAPI
├── seed.py                 ajoute les données initiales
├── requirements.txt        bibliothèques Python nécessaires
├── entomo.db               base SQLite utilisée normalement
├── app/
│   ├── api/v1/endpoints/   routes HTTP, portes d'entrée de l'API
│   ├── schemas/            formes des données entrantes/sortantes
│   ├── crud/               opérations avec la base de données
│   ├── models/             description Python des tables SQL
│   ├── db/session.py       connexion et sessions de base de données
│   └── core/               configuration, sécurité et erreurs
├── alembic/                préparation des migrations de base
└── tests/                  tests automatiques
```

La convention importante est : un même sujet possède souvent trois fichiers.

```text
api/v1/endpoints/sites.py  → reçoit la requête
schemas/site.py            → vérifie la forme des données
models/site.py             → décrit la table
crud/site.py               → lit ou modifie la table
```

## 4. Comment le backend démarre

La commande habituelle est :

```powershell
python start.py
```

`start.py` réalise trois actions :

1. lance FastAPI avec Uvicorn sur `http://127.0.0.1:8765` ;
2. exécute `backend/seed.py` pour initialiser les données ;
3. sert le frontend sur `http://127.0.0.1:8766`.

Dans `backend/main.py` :

- `Base.metadata.create_all(...)` crée les tables absentes ;
- les middlewares CORS, compression et erreurs sont installés ;
- `api_router` branche toutes les routes sous `/api/v1` ;
- `/uploads` rend les fichiers envoyés accessibles ;
- `/health` permet de vérifier que le serveur fonctionne.

Documentation interactive disponible quand le backend tourne :

```text
http://127.0.0.1:8765/api/v1/docs
```

## 5. Une API, c'est quoi ?

Une API est un ensemble d'adresses que le frontend peut appeler. Une route combine une **méthode HTTP** et une **URL**.

| Méthode | Sens simple | Exemple |
|---|---|---|
| `GET` | lire | `GET /api/v1/sites/` |
| `POST` | créer | `POST /api/v1/sites/` |
| `PUT` | modifier | `PUT /api/v1/sites/12` |
| `DELETE` | supprimer | `DELETE /api/v1/sites/12` |

Les principales familles de routes sont déclarées dans `backend/app/api/v1/__init__.py` : authentification, utilisateurs, rôles, sites, captures, datasets, modèles ML, DHIS2, rapports, tableaux de bord, indicateurs, langues, synchronisation, interventions, notifications, audit, campagnes, références et imports.

## 6. Exemple complet : créer un site

Supposons que l'utilisateur remplit un formulaire puis clique sur **Créer**.

### Étape 1 — Le frontend envoie du JSON

`frontend/www/js/api.js` finit par exécuter :

```javascript
apiRequest('POST', '/sites/', data)
```

Exemple de données envoyées :

```json
{
  "nom": "Site Dakar Nord",
  "code": "DK-NORD",
  "region": "Dakar",
  "actif": true
}
```

L'adresse complète devient `POST http://127.0.0.1:8765/api/v1/sites/`.

### Étape 2 — La route reçoit la demande

Dans `endpoints/sites.py`, la fonction `create_site()` reçoit le JSON. FastAPI injecte aussi :

- `db`, une session de base de données ;
- l'utilisateur connecté, obtenu grâce au jeton JWT.

### Étape 3 — Le schéma valide

`schemas/site.py` contient `SiteSentinelleCreate`. Pydantic vérifie par exemple que `nom` existe et que `actif` est un booléen.

Un **schéma Pydantic** est donc un contrôleur à l'entrée et à la sortie. Il ne crée pas une table.

### Étape 4 — La règle métier est appliquée

La route vérifie que le code du site n'est pas déjà utilisé. Si oui, elle renvoie l'erreur HTTP `400`.

### Étape 5 — Le CRUD enregistre

`crud/site.py`, aidé par `crud/base.py`, transforme les données en objet SQLAlchemy puis fait :

```python
db.add(db_obj)     # prépare l'ajout
db.commit()        # confirme dans SQLite
db.refresh(db_obj) # relit l'objet avec son id
```

**CRUD** signifie Create, Read, Update, Delete : créer, lire, modifier, supprimer.

### Étape 6 — Le modèle indique la table

`models/site.py` associe la classe `SiteSentinelle` à la table `sites_sentinelles`. Chaque objet Python correspond à une ligne de cette table.

### Étape 7 — La réponse remonte

SQLite produit la ligne, SQLAlchemy la convertit en objet, Pydantic en réponse JSON, puis le frontend met la page à jour.

## 7. Modèle, schéma et CRUD : ne pas les confondre

| Élément | Question à laquelle il répond |
|---|---|
| Route/API | Quelle adresse peut-on appeler ? |
| Schéma Pydantic | Quelles données sont acceptées ou renvoyées ? |
| Modèle SQLAlchemy | À quoi ressemble la table ? |
| CRUD | Comment lire ou modifier cette table ? |
| Service/règle dans la route | Cette opération est-elle autorisée et logique ? |

Image mentale : le schéma est le formulaire de contrôle, le modèle est le casier de rangement, et le CRUD est la personne qui range ou récupère le dossier.

## 8. Comment la connexion SQLite fonctionne

`backend/app/core/config.py` définit par défaut :

```text
DATABASE_URL = sqlite:///./entomo.db
```

`backend/app/db/session.py` crée ensuite :

- `engine` : le moteur qui sait parler à SQLite ;
- `SessionLocal` : une fabrique de sessions ;
- `get_db()` : ouvre une session pour une requête puis la ferme.

Une **session** ressemble à une conversation temporaire avec la base. Chaque requête API reçoit sa propre conversation, puis `finally: db.close()` la ferme même en cas d'erreur.

## 9. Les tables principales et leurs liens

Chaque table héritant de `BaseModel` reçoit automatiquement `id`, `created_at` et `updated_at`.

| Domaine | Tables importantes | Rôle |
|---|---|---|
| Accès | `users`, `roles`, `permissions`, `role_permission` | comptes et droits |
| Terrain | `sites_sentinelles`, `site_activites`, `captures`, `campagnes`, `interventions` | travail entomologique |
| Données/ML | `datasets`, `annotations`, `ml_models`, `risk_models`, `model_pipelines` | jeux de données et modèles |
| Échange | `dhis2_config`, `dhis2_mappings`, `dhis2_syncs`, `data_imports` | import et synchronisation |
| Suivi | `rapports`, `rapports_programmes`, `notifications`, `audit_logs` | rapports, alertes et traces |
| Configuration | `indicateurs`, `langues`, `reference_data` | listes et paramètres |

Relations essentielles :

```text
roles 1 ─── plusieurs users
users 1 ─── plusieurs captures / datasets / rapports / actions
sites_sentinelles 1 ─── plusieurs captures
sites_sentinelles 1 ─── plusieurs interventions
sites_sentinelles 1 ─── plusieurs site_activites
datasets 1 ─── plusieurs annotations
datasets 1 ─── plusieurs ml_models
ml_models 1 ─── plusieurs captures ou model_pipelines
dhis2_config 1 ─── plusieurs mappings et synchronisations
rapports 1 ─── plusieurs rapports_programmes
```

### Clé primaire et clé étrangère

- Une **clé primaire**, comme `users.id`, identifie une ligne de façon unique.
- Une **clé étrangère**, comme `captures.site_id`, pointe vers une ligne d'une autre table.

Exemple : si une capture contient `site_id = 3`, elle appartient au site dont l'`id` vaut `3`. Cela évite de recopier toutes les informations du site dans chaque capture.

Les tables `role_permission` et `user_notification` sont des tables de liaison : elles servent aux relations plusieurs-à-plusieurs.

## 10. Authentification et JWT

Lors de la connexion :

1. le frontend envoie le nom d'utilisateur et le mot de passe à `/api/v1/auth/login` ;
2. le backend vérifie le mot de passe haché ;
3. il renvoie un **jeton JWT** ;
4. le frontend stocke ce jeton dans `localStorage` ;
5. les requêtes suivantes ajoutent `Authorization: Bearer <jeton>` ;
6. `get_current_active_user` vérifie le jeton et charge l'utilisateur.

Le JWT est comparable à un badge temporaire. Il ne faut jamais mettre le mot de passe dans ce badge.

## 11. Les codes HTTP utiles

| Code | Signification |
|---|---|
| `200` | succès |
| `201` | ressource créée (quand la route l'utilise) |
| `400` | données ou règle métier incorrectes |
| `401` | non connecté ou jeton invalide |
| `403` | connecté mais non autorisé |
| `404` | élément introuvable |
| `422` | JSON non conforme au schéma Pydantic |
| `500` | erreur imprévue du serveur |

## 12. Où commencer pour comprendre le code

Ordre de lecture conseillé :

1. `start.py` pour voir comment tout démarre ;
2. `backend/main.py` pour comprendre l'application FastAPI ;
3. `backend/app/api/v1/__init__.py` pour voir toutes les familles de routes ;
4. choisir un petit domaine, par exemple **sites** ;
5. lire dans l'ordre `endpoints/sites.py`, `schemas/site.py`, `crud/site.py`, `models/site.py` ;
6. lire `frontend/www/js/api.js` pour voir l'appel depuis le navigateur ;
7. essayer les routes dans `/api/v1/docs` ;
8. lire les tests, qui donnent des exemples d'utilisation attendue.

Ne commence pas par tous les fichiers à la fois. Suis une fonctionnalité de l'écran jusqu'à la table, puis remonte.

## 13. Ajouter une nouvelle fonctionnalité

Pour ajouter une ressource simple appelée `Piege` :

1. créer le modèle SQLAlchemy dans `models/piege.py` ;
2. importer le modèle dans `models/__init__.py` pour que SQLAlchemy le connaisse ;
3. créer les schémas `PiegeCreate`, `PiegeUpdate`, `PiegeResponse` ;
4. créer le CRUD ;
5. créer les routes HTTP ;
6. enregistrer le routeur dans `api/v1/__init__.py` ;
7. ajouter les appels dans `frontend/www/js/api.js` ;
8. écrire des tests ;
9. utiliser une migration Alembic si la base existe déjà en production.

`create_all()` crée les tables absentes, mais ne gère pas proprement toutes les modifications d'une table existante. C'est le rôle des **migrations**.

## 14. Petits exercices sans risque

1. Lance le projet et ouvre `/api/v1/docs`.
2. Connecte-toi et exécute `GET /api/v1/sites/`.
3. Repère la fonction Python appelée dans `endpoints/sites.py`.
4. Retrouve la table correspondante dans `models/site.py`.
5. Ajoute un site depuis l'interface puis recharge la liste.
6. Lis `backend/tests/test_sites.py` et prédis le résultat avant chaque assertion.

## 15. Mini-glossaire

- **Backend** : code exécuté sur le serveur.
- **Frontend** : interface exécutée dans le navigateur.
- **API** : contrat permettant aux deux de communiquer.
- **Endpoint/route** : méthode HTTP + URL déclenchant une fonction.
- **JSON** : format texte d'échange de données.
- **ORM** : outil qui manipule les tables avec des objets Python ; ici SQLAlchemy.
- **Modèle** : classe Python représentant une table.
- **Schéma** : forme validée des données ; ici Pydantic.
- **CRUD** : créer, lire, modifier, supprimer.
- **SQLite** : base stockée dans un seul fichier.
- **JWT** : badge numérique temporaire d'authentification.
- **CORS** : règle indiquant quels sites web peuvent appeler l'API.
- **Middleware** : traitement traversé par les requêtes, par exemple CORS ou gestion d'erreur.
- **Migration** : modification versionnée de la structure de la base.
- **Seed** : données initiales ajoutées pour démarrer ou tester.

## À retenir absolument

Le chemin fondamental est :

```text
Page → api.js → route FastAPI → schéma → CRUD → modèle → SQLite
```

Quand tu ne comprends pas une fonctionnalité, cherche son appel dans `api.js`, retrouve son endpoint, puis suis les imports vers le schéma, le CRUD et le modèle. C'est ta boussole dans ce projet.
