# Architecture du Projet : Agent de Trading ES Futures (TypeScript)

Ce document détaille l'architecture technique pour l'implémentation de l'agent de trading sous forme de scripts **TypeScript**.

## 📐 Vue d'Ensemble

L'approche choisie est **hybride et robuste** :
*   **Cerveau (Logic)** : Codé en **TypeScript** pour la manipulation complexe de données, les calculs financiers et la logique de décision.
*   **Mémoire (Storage)** : **PostgreSQL** pour stocker l'historique des indicateurs, les prédictions passées et les performances de l'agent.
*   **Orchestration (Trigger)** : Peut être déclenché par **n8n**, un Cron job, ou manuellement.
*   **Données** : Agrégation multi-sources (APIs & Scraping).

L'agent n'est pas une simple boîte noire, c'est un programme modulaire capable de lire, comprendre et synthétiser le contexte économique.

---

## 🏗️ Composants du Système

### 1. La Couche d'Ingestion (Data Layer)
Des modules TypeScript spécifiques (Clients API) sont responsables de la récupération propre des données. Ils gèrent les clés API, les limites de taux (rate limits) et le formatage initial.

*   `FredClient` : Connecteur pour les séries temporelles (PIB, Inflation).
*   `BlsClient` : Connecteur pour les statistiques du travail (NFP, Chômage).
*   `FmpClient` : Connecteur pour les données de marché (Yields, Taux).
*   `NewsAggregator` : Module pour scraper ou récupérer les titres de news (ZeroHedge, FinancialJuice).

### 2. Le Moteur d'Analyse (Core Logic)
C'est le cœur de l'agent. Il prend les données brutes et les transforme en "Intelligence".

*   **Normalisation** : Convertir toutes les données dans un format standard (ex: JSON unifié).
*   **Comparateur (Surprise Index)** : Calcule la différence entre `Actual` et `Forecast` pour évaluer l'impact immédiat.
*   **Calculateur de Tendance** : Algorithme pondéré qui détermine si le contexte est `BULLISH`, `BEARISH` ou `RANGE` basé sur la confluence des indicateurs (ex: Yields en baisse + Bon Earnings = Bullish).

### 3. La Couche de Persistance (Database Layer)
Gère le stockage durable des informations pour permettre le backtesting et l'analyse historique.

*   **PostgreSQL** : Base de données relationnelle robuste.
*   **ORM (Prisma/Drizzle)** : Interface TypeScript pour interagir avec la DB de manière sécurisée.
*   **Tables Clés** : `economic_events`, `price_predictions`, `daily_trends`, `market_sentiment`.

### 4. La Couche de Présentation (Reporting)
Génère les sorties lisibles pour l'humain et la machine.

*   **Markdown Generator** : Construit le rapport journalier (Trend, Levels, Risks).
*   **Signal Emitter** : Formate les signaux pour l'envoi (JSON pour n8n, Texte pour Telegram).

---

## 📂 Structure de Fichiers Proposée (TypeScript)

Voici comment organiser le code source pour garder le projet propre et évolutif :

```text
/financial-analyst-agent
│
├── /src
│   ├── /api              # Connecteurs aux services externes
│   │   ├── fred.ts       # Client API FRED
│   │   ├── bls.ts        # Client API BLS
│   │   └── fmp.ts        # Client API Financial Modeling Prep
│   │
│   ├── /core             # Logique métier pure
│   │   ├── analyzer.ts   # Algorithmes d'analyse de marché
│   │   ├── trends.ts     # Calcul de la tendance journalière
│   │   └── levels.ts     # Calcul des supports/résistances (ES Zones)
│   │
│   ├── /db               # Gestion de la Base de Données
│   │   ├── client.ts     # Connexion Postgres (Prisma/Drizzle)
│   │   ├── schema.ts     # Définition des schémas de données
│   │   └── repository.ts # Fonctions d'écriture/lecture (CRUD)
│   │
│   ├── /models           # Définitions de types (Interfaces TS)
│   │   ├── EconomicEvent.ts
│   │   └── MarketReport.ts
│   │
│   ├── /utils            # Outils divers
│   │   ├── logger.ts     # Gestion des logs
│   │   └── formatter.ts  # Formatage des dates et chiffres
│   │
│   └── main.ts           # Point d'entrée (Script principal)
│
├── /config               # Configuration (Clés API, Paramètres)
│   └── default.json
│
├── package.json          # Dépendances (axios, dotenv, etc.)
└── tsconfig.json         # Config TypeScript
```

---

## 🔄 Flux de Données (Data Flow)

1.  **Trigger (08:00 AM)** : Le script `main.ts` est lancé.
2.  **Fetch** : Les clients dans `/api` interrogent FRED, BLS, etc. en parallèle.
3.  **Process** :
    *   Les données sont nettoyées.
    *   `analyzer.ts` compare les chiffres actuels aux précédents.
    *   `trends.ts` évalue la corrélation avec le prix du ES.
4.  **Persist** :
    *   L'agent sauvegarde les données brutes et son analyse dans **PostgreSQL**.
    *   Cela crée un historique précieux pour affiner les futurs algorithmes.
5.  **Output** :
    *   Le script génère un objet JSON complet de l'état du marché.
    *   Il génère aussi le bloc texte Markdown pour le rapport Discord/Telegram.
6.  **Action** : n8n récupère ce JSON et le distribue (Google Sheets, Alerte Telegram).

## 🛠️ Stack Technique Recommandée

*   **Runtime** : Node.js (LTS)
*   **Langage** : TypeScript 5.x
*   **Requêtes HTTP** : `axios` ou `got` (pour la robustesse).
*   **Base de Données** : PostgreSQL 15+.
*   **ORM** : Prisma ou Drizzle (Indispensable pour le typage TS).
*   **Parsing** : `cheerio` (si besoin de scraper des news simples).
*   **Validation** : `zod` (pour valider que les données API sont conformes).
*   **Logs** : `winston` ou `pino`.

---

## 🚀 Avantages de cette approche
1.  **Typage Fort** : En finance, une erreur de type (string vs number) peut être critique. TypeScript protège contre cela.
2.  **Testabilité** : On peut écrire des tests unitaires pour vérifier que le calcul de la tendance est correct sans appeler les vraies API.
3.  **Indépendance** : L'agent est un programme autonome. n8n ne sert que de "facteur" pour livrer les messages, mais l'intelligence est dans le code.
