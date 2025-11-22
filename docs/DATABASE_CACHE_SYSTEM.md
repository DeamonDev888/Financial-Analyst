# Système de Base de Données et Cache

## 🎯 Objectif

Le système de persistance du **Financial Analyst** repose sur PostgreSQL. Il sert à la fois de mémoire à long terme (historique) et de cache à court terme pour optimiser les performances et réduire les appels aux sources externes.

## 🏗️ Architecture

### Schéma de Base de Données

Le schéma est défini dans `src/backend/database/schema_simplified.sql`.

#### 1. Table `news_items`

Stocke toutes les nouvelles collectées.

- `hash` (Unique) : Empêche les doublons (MD5 de titre + source).
- `published_at` : Date de publication originale.
- `created_at` : Date de scraping.
- `source` : Origine (ZeroHedge, CNBC, etc.).

#### 2. Table `sentiment_analyses`

Historique des décisions de l'IA.

- `sentiment` : BULLISH/BEARISH/NEUTRAL.
- `score` : Valeur numérique (-100 à 100).
- `raw_response` : JSON complet retourné par l'IA.

#### 3. Table `news_sources`

Configuration et état des sources (Optionnel/Évolutif).

### Mécanisme de Cache

Le "cache" n'est pas un système séparé (comme Redis), mais une utilisation intelligente de PostgreSQL.

1.  **Vérification** : Avant de scraper, `SentimentAgentFinal` demande : "Y a-t-il des news récentes (moins de 2h) dans la DB ?"
2.  **Hit** : Si oui, on utilise les données de la DB. -> **Rapide (3-5s)**.
3.  **Miss** : Si non, on lance le scraping, on insère en DB, puis on relit. -> **Plus lent (10-15s)**.

## 🚀 Commandes de Gestion

### Initialisation

```bash
npm run db:init
# Exécute create_database.ts pour créer les tables
```

### Vérification de l'État

```bash
npm run status
```

Affiche :

- Nombre de news en base.
- État du cache (FRESH/STALE).
- Dernière analyse enregistrée.

### Maintenance

Le script `NewsDatabaseService` inclut des méthodes pour nettoyer les vieilles données (ex: > 30 jours), qui sont appelées périodiquement ou peuvent être scriptées si besoin.

## 🔧 Configuration (`.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_analyst
DB_USER=postgres
DB_PASSWORD=****
```

## 📊 Performance

- **Sans Cache** : ~20-30s (Scraping HTTP + Parsing + IA).
- **Avec Cache** : ~3-5s (Lecture DB + IA).
- **Économie** : Réduit drastiquement la charge sur les serveurs cibles (ZeroHedge, etc.) et évite les bannissements d'IP.
