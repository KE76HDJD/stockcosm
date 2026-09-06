# StockCosm — Gestion de Stock Cosmétiques

Application interne de gestion de stock pour **KET SKIN CARE BY MINA LA PREFEREE**.  
Deux rôles : **ADMIN** (accès complet) et **ASSISTANT** (opérations quotidiennes).

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand, Framer Motion, Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Base | PostgreSQL 15+ via asyncpg |
| Auth | JWT (python-jose) + 2FA (TOTP via pyotp) |

## Installation

### Prérequis

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+ (port 5435, base `gestion_stock_cosmetiques`)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env  # puis éditer les valeurs

# Initialiser la base
python seed.py

# Lancer
uvicorn app.main:app --host 0.0.0.0 --port 8024 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

### Comptes par défaut

| Utilisateur | Mot de passe | Rôle |
|------------|-------------|------|
| admin | admin123 | ADMIN |
| assistant | assist123 | ASSISTANT |

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DATABASE_URL` | URL async PostgreSQL | `postgresql+asyncpg://postgres:yaokouma@localhost:5435/gestion_stock_cosmetiques` |
| `SECRET_KEY` | Clé de signature JWT | (générée) |
| `JWT_EXPIRY_HOURS` | Durée de validité du token | `24` |
| `ENVIRONMENT` | `development` ou `production` | `development` |
| `GEMINI_API_KEY` | Clé API Gemini (optionnel, assistant IA) | `None` |

## Structure du projet

```
StockCosm/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── routers/       # Endpoints FastAPI
│   │   ├── schemas/       # DTOs Pydantic
│   │   ├── services/      # Logique métier
│   │   ├── utils/         # JWT, sécurité
│   │   ├── config.py      # Settings (pydantic-settings)
│   │   ├── database.py    # Engine, session
│   │   ├── dependencies.py# Auth, rôles
│   │   └── main.py        # App FastAPI
│   ├── alembic/           # Migrations
│   ├── uploads/           # Photos de profil
│   └── backups/           # Sauvegardes DB
├── frontend/
│   └── src/
│       ├── api/           # Appels API (Axios)
│       ├── components/    # Composants réutilisables
│       ├── pages/         # Pages (React Router)
│       ├── hooks/         # Hooks React / stores Zustand
│       ├── contexts/      # Contexts (thème)
│       ├── types/         # Types TypeScript
│       └── styles/        # CSS global
└── README.md
```

## Décisions d'architecture

### Pas de prix/montant en base

L'application ne stocke **aucun prix ni montant**. Elle gère uniquement les quantités physiques.
Justification : les prix changent souvent, les marges sont calculées en dehors de l'outil de stock.
Un futur intervenant ne doit PAS ajouter de colonnes `price`/`amount` sans validation métier.

### Kit = composition à la volée (pas un produit catalogue)

Un "kit" est une vente composée de produits existants, créée au moment de la vente.
Il n'existe **pas de table `kits`** ni de `kit_compositions` persistantes.
Justification : les kits varient selon les commandes, les cataloguer ajouterait une couche de maintenance inutile.
Le type `VenteType.KIT` dans le modèle indique simplement que la vente est multi-produits.

### Stock atomique via SQL brut

Les opérations de stock (décrément, incrémentation, ajustement) utilisent des `UPDATE ... WHERE stock_quantity >= :qty RETURNING stock_quantity` plutôt que des `SELECT FOR UPDATE` + logique Python.
Justification : les `SELECT FOR UPDATE` causent des deadlocks avec les transactions concurrentes (INSERT pending dans la même session). L'approche atomique SQL est plus sûre et plus performante.

### `get_db()` sans commit automatique

Le dependency injector `get_db()` ne commit pas automatiquement. Chaque endpoint mutant appelle `await db.commit()` explicitement avant de retourner la réponse.
Justification : FastAPI exécute le cleanup du generator (commit) APRÈS l'envoi de la réponse HTTP. Sans commit explicite, un GET immédiat après un POST verrait des données obsolètes.

### CHECK constraint `stock_quantity >= 0`

Double protection : contrainte SQL `chk_stock_non_negatif` + vérification applicative dans `_atomic_decrement`.
Justification : la contrainte DB empêche les corruptions même en cas de bug applicatif. La vérification applicative donne des messages d'erreur propres.

### Authentification stateless (JWT)

Pas de session serveur. Le token JWT contient `sub` (user_id) et `role`.
Justification : permet de scaler horizontalement sans stockage de session partagé.

### Frontend : pas de test framework

Le frontend n'a actuellement aucun test. Les tests E2E manuels sont suffisants pour l'usage interne actuel.
Si le projet grandit, ajouter Vitest + React Testing Library.
