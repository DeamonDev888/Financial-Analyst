# Architecture NOVAQUOTE : Financial Analyst & Trading Agents

Ce document détaille l'architecture technique du système NOVAQUOTE, un écosystème d'agents de trading autonomes propulsés par l'IA (**x-ai/grok-code-fast-1**) et orchestrés via une architecture Backend/Frontend temps réel.

## 📐 Vue d'Ensemble

Le système repose sur une architecture **Backend <-> Frontend** communiquant via **WebSockets**, où chaque agent est une entité TypeScript autonome utilisant le CLI `kilocode` pour son raisonnement.

*   **Cerveau (AI)** : Modèle `x-ai/grok-code-fast-1` via `kilocode` CLI.
*   **Orchestration** : Backend Node.js/TypeScript.
*   **Communication** : WebSockets (Temps réel).
*   **Mémoire** : PostgreSQL (Données structurées) + Système de Fichiers (Pipelines JSON).

---

## 🏗️ Composants du Système

### 1. La Couche d'Ingestion (Data Layer)
Des modules TypeScript spécifiques (Clients API) sont responsables de la récupération propre des données. Ils gèrent les clés API, les limites de taux (rate limits) et le formatage initial.

*   **FredClient** : Connecteur pour les séries temporelles (PIB, Inflation).
*   **BlsClient** : Connecteur pour les statistiques du travail (NFP, Chômage).
*   **FmpClient** : Connecteur pour les données de marché (Yields, Taux).
*   **NewsAggregator** : Module pour scraper ou récupérer les titres de news (ZeroHedge, FinancialJuice).

### 2. Le Moteur d'Analyse (Core Logic)
C'est le cœur de l'agent. Il prend les données brutes et les transforme en "Intelligence" exploitable par l'IA ou les algorithmes déterministes.

*   **Normalisation** : Convertir toutes les données dans un format standard.
*   **ToonFormatter** : Convertit les données JSON volumineuses en format **TOON** (Token-Oriented Object Notation) pour réduire la consommation de tokens de 30-60% avant l'envoi à l'IA.
*   **Comparateur (Surprise Index)** : Calcule la différence entre `Actual` et `Forecast`.
*   **Calculateur de Tendance** : Algorithme pondéré pour le contexte `BULLISH`/`BEARISH`.

### 3. Les Agents AI (KiloCode Pipelines)
Chaque agent (`BaseAgent`) est une classe TypeScript qui enveloppe des appels au CLI `kilocode`.
*   **Pipeline de Fichiers** : Pour la robustesse et le volume de données, les agents utilisent des fichiers d'entrée/sortie.
    ```bash
    cat data/input.json | kilocode -m ask --auto --json "Prompt..." > data/output.json
    ```
*   **Modèle** : `x-ai/grok-code-fast-1` (Configuré pour 256k contexte & haute performance).
*   **Rôles** :
    *   `RiskAgent` : Analyse l'exposition et la volatilité.
    *   `StrategyAgent` : Propose des plans de trading basés sur l'historique.
    *   `RiskAgent` : Analyse l'exposition et la volatilité.
    *   `StrategyAgent` : Propose des plans de trading basés sur l'historique.
    *   `SentimentAgent` : Scrape les news (ZeroHedge, ZoneBourse) et analyse le sentiment global (Bullish/Bearish).
    *   `MasterAgent` : Consolide les signaux pour la décision finale.

### 4. La Couche de Persistance (Database Layer)
Gère le stockage durable des informations pour permettre le backtesting et l'analyse historique.

*   **PostgreSQL** : Base de données relationnelle robuste.
*   **ORM (Prisma/Drizzle)** : Interface TypeScript pour interagir avec la DB de manière sécurisée.
*   **Tables Clés** : `economic_events`, `price_predictions`, `daily_trends`, `market_sentiment`.
*   **File System (`/data`)** : Stockage transitoire et auditable des raisonnements AI.

### 5. Backend & Orchestration (Node.js/TS)
Le serveur central gère le cycle de vie des agents et la distribution des messages.
*   **WebSocket Server** : Diffuse les mises à jour d'état et les signaux au frontend.
*   **Agent Manager** : Instancie et surveille les agents.
*   **Scheduler** : Déclenche les pipelines d'analyse.

### 6. Frontend (Dashboard)
Interface utilisateur pour le monitoring en temps réel.
*   Visualisation des signaux de trading.
*   Logs des décisions des agents ("Pourquoi l'agent a pris cette décision ?").
*   Contrôle manuel (Start/Stop agents).

---

## 🔄 Flux de Données (Pipeline AI)

Le traitement suit un flux rigoureux pour assurer la traçabilité :

1.  **Ingestion** : Le Backend récupère les données de marché (API FRED, BLS, etc.).
2.  **Préparation** : Création d'un fichier JSON contextuel (`data/agent-data/risk-agent/input_timestamp.json`).
3.  **Inférence (KiloCode)** :
    *   Le `BaseAgent` construit la commande `kilocode`.
    *   Exécution du modèle `x-ai/grok-code-fast-1`.
    *   Le résultat est écrit dans un fichier de sortie.
4.  **Parsing & Action** :
    *   Le TypeScript lit le fichier de sortie JSON.
    *   Validation des données (Zod).
    *   Envoi du signal via WebSocket et stockage en DB.

---

## 📂 Structure de Fichiers (Principe : Une Fonction = Un Fichier)

L'architecture suit strictement le principe de **Modularité Atomique**. Chaque classe, utilitaire ou fonction majeure doit résider dans son propre fichier pour faciliter la maintenance et les tests unitaires.

```text
/novaquote-system
│
├── /data                 # Pipelines I/O (Ignoré par Git sauf exemples)
│   ├── /test-input       # Entrées temporaires
│   ├── /test-output      # Sorties temporaires
│   └── /agent-data       # Historique par agent
│       ├── /risk-agent
│       ├── /strategy-agent
│       └── /master-agent
│
├── /src
│   ├── /backend
│   │   ├── /agents       # Logique des agents (1 Agent = 1 Fichier)
│   │   │   ├── BaseAgent.ts     # Wrapper KiloCode Abstrait
│   │   │   ├── RiskAgent.ts     # Agent de Risque
│   │   │   ├── StrategyAgent.ts # Agent de Stratégie
│   │   │   ├── SentimentAgent.ts# Agent de Sentiment (News & Scraping)
│   │   │   └── MasterAgent.ts   # Agent Orchestrateur
│   │   │
│   │   ├── /ingestion    # Clients API (1 Service = 1 Fichier)
│   │   │   ├── FredClient.ts      # Client FRED API
│   │   │   ├── BlsClient.ts       # Client BLS API
│   │   │   ├── FmpClient.ts       # Client FMP API
│   │   │   └── NewsAggregator.ts  # Scraper de News
│   │   │
│   │   ├── /core         # Logique Métier (1 Algo = 1 Fichier)
│   │   │   ├── Normalizer.ts      # Normalisation des données
│   │   │   ├── SurpriseIndex.ts   # Calculateur de surprise macro
│   │   │   ├── TrendCalculator.ts # Algo de tendance pondérée
│   │   │   └── Server.ts          # Point d'entrée du serveur
│   │   │
│   │   ├── /db           # Persistance (1 Entité = 1 Repository)
│   │   │   ├── DbClient.ts        # Connexion Singleton
│   │   │   ├── EventRepository.ts # CRUD Événements Éco
│   │   │   └── SignalRepository.ts# CRUD Signaux Trading
│   │   │
│   │   └── /utils        # Utilitaires (1 Outil = 1 Fichier)
│   │       ├── ToonFormatter.ts   # Convertisseur JSON -> TOON
│   │       └── Logger.ts          # Gestionnaire de logs
│   │
│   ├── /frontend         # Code client
│   │   ├── /components   # Composants UI isolés
│   │   └── index.html
│   │
│   └── /types            # Interfaces partagées
│       ├── EconomicEvent.ts
│       └── TradingSignal.ts
│
├── /config               # Configuration
│   └── kilocode.json     # (Reference seulement)
│
└── package.json
```

---

## ⚙️ Configuration KiloCode

L'intégration repose sur la configuration correcte du CLI KiloCode sur la machine hôte.

**Fichier** : `~/.kilocode/cli/config.json`
```json
{
  "provider": "xai",
  "model": "x-ai/grok-code-fast-1",
  "timeout": 120,
  "default_mode": "ask"
}
```

## 🛠️ Stack Technique

*   **Runtime** : Node.js (Backend), Navigateur (Frontend).
*   **Langage** : TypeScript (Strict mode).
*   **AI Engine** : KiloCode CLI + x-ai/grok-code-fast-1.
*   **Database** : PostgreSQL + Prisma/Drizzle.
*   **Transport** : Socket.io ou `ws`.
