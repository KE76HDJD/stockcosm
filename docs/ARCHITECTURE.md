# Décisions d'architecture — StockCosm

Ce document enregistre les choix d'architecture qui s'écartent d'un choix par défaut évident, afin qu'un futur intervenant ne les annule pas par erreur.

## 1. Pas de prix ni de montant en base

**Décision** : Aucune colonne `price`, `amount`, `cost` n'existe dans les tables `produits`, `ventes`, ou `ventes_lignes`.

**Justification** : L'outil gère les **quantités physiques** uniquement. Les prix sont gérés en dehors (tableur, ERP, etc.) car :
- Les prix changent souvent (promotions, saisonnalité)
- Les marges sont calculées métier, pas dans l'outil de stock
- Ajouter des prix introduirait des problèmes de traçabilité historique des prix

**Implication** : Ne jamais ajouter de colonnes de prix sans validation métier explicite.

## 2. Kit = composition à la volée

**Décision** : Un "kit" est une vente multi-produits créée au moment de la vente. Il n'existe pas de table `kits` ni `kit_compositions`.

**Justification** : Les kits varient selon les commandes clients. Les cataloguer en base ajouterait une couche de maintenance inutile pour un bénéfice nul. Le champ `Vente.type = 'KIT'` dans la table `ventes` indique simplement que la vente contient plusieurs produits.

**Implication** : Ne pas créer de table `kits`. Le type KIT est un indicateur de vente multi-lignes.

## 3. Stock atomique via SQL brut

**Décision** : Les opérations critiques de stock utilisent `UPDATE ... WHERE stock_quantity >= :qty RETURNING stock_quantity` plutôt que `SELECT FOR UPDATE` + logique Python.

**Justification** : L'approche `SELECT FOR UPDATE` causait des deadlocks PostgreSQL (ShareLock sur transactions) quand des transactions concurrentes inséraient des ventes lignes + verrouillaient le même produit. L'approche atomique SQL :
- Élimine les deadlocks (pas de verrouillage de ligne long)
- Garantit l'atomicité au niveau SQL (check + update en une instruction)
- La contrainte `CHECK (stock_quantity >= 0)` est la sécurité de dernier recours

**Implication** : Les services qui modifient le stock doivent utiliser `_atomic_decrement`, `_atomic_increment`, `_atomic_set` plutôt que des opérations ORM directes.

## 4. `get_db()` sans commit automatique

**Décision** : Le dependency injector `get_db()` ne commit pas. Chaque endpoint mutant appelle `await db.commit()` explicitement.

**Justification** : FastAPI exécute le cleanup du generator dependency (code après `yield`) **après** l'envoi de la réponse HTTP au client. Sans commit explicite dans l'endpoint, un GET immédiat après un POST verrait des données pré-commit (stale reads).

**Implication** : Tout endpoint POST/PUT/PATCH/DELETE doit inclure `await db.commit()` avant de retourner la réponse.

## 5. Double protection stock négatif

**Décision** : Deux mécanismes empêchent le stock négatif :
1. Contrainte SQL : `chk_stock_non_negatif CHECK (stock_quantity >= 0)`
2. Logique applicative : `_atomic_decrement` vérifie `stock_quantity >= qty`

**Justification** : La contrainte SQL est la sécurité de dernier recours (empêche les corruptions même en cas de bug applicatif). La logique applicative donne des messages d'erreur propres (HTTP 409 au lieu de 500).

## 6. Authentification stateless (JWT)

**Décision** : Pas de session serveur. Le token JWT contient `sub` (user_id) et `role`.

**Justification** : Permet de scaler horizontalement sans stockage de session partagé (Redis, etc.). Pour l'usage interne actuel (2-3 utilisateurs), c'est overkill mais c'est le standard et ça ne coûte rien.

## 7. Frontend sans test framework

**Décision** : Le frontend n'a actuellement aucun test automatisé.

**Justification** : Pour un outil interne à 2-3 utilisateurs, les tests E2E manuels sont suffisants. L'investissement dans Vitest + React Testing Library ne serait justifié que si :
- Le projet grandit significativement (nombre d'utilisateurs, fréquence des changements)
- Des bugs récurrents justifient une couverture de non-régression

**Implication** : Si le projet grandit, ajouter Vitest + React Testing Library en priorité sur les composants critiques (NouvelleVente, Dashboard).

## 8. Pas de sur-ingénierie

**Décision** : Monolithe modulaire sans microservices, files de messages, cache distribué, ou infrastructure distribuée.

**Justification** : Le projet gère quelques centaines de produits, 2-3 utilisateurs concurrents, pour un usage interne. L'infrastructure actuelle (1 serveur, 1 base PostgreSQL) est largement suffisante. Les ajouts d'infrastructure ne seront faits que si un volume réel le justifie.

**Implication** : Ne pas introduire Redis, RabbitMQ, Kubernetes, ou autre sans besoin mesuré.
