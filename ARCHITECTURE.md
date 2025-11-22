# Architecture: Financial Analyst - ES Futures Trading System

Ce document détaille l'architecture technique du système **Financial Analyst**, une solution robuste d'analyse de sentiment de marché pour les Futures ES (S&P 500), propulsée par l'IA (**x-ai/grok-code-fast-1**) et une base de données PostgreSQL.

## 📐 Vue d'Ensemble

Le système a évolué d'une architecture multi-agents complexe vers une architecture **centrée sur les données (Data-Centric)** et **robuste**, privilégiant la fiabilité de l'analyse de sentiment via une intégration forte avec PostgreSQL.

*   **Cerveau (AI)** : Modèle `x-ai/grok-code-fast-1` via `kilocode` CLI.
*   **Orchestration** : CLI TypeScript (`run.ts`).
*   **Mémoire & Source de Vérité** : PostgreSQL (News, Historique d'analyses).
*   **Format de Données** : TOON (Token-Oriented Object Notation) pour l'optimisation du contexte.

---

## 🏗️ Composants du Système

### 1. La Couche d'Ingestion & Persistance (Data Layer)
Gérée par `NewsDatabaseService`, cette couche est responsable de la collecte, du stockage et de la récupération des données de marché.

*   **NewsAggregator** : Collecte les news depuis diverses sources (ZeroHedge, CNBC, FinancialJuice).
*   **PostgreSQL** : Stockage durable et structuré.
    *   `news_items` : Stocke les titres et métadonnées des news (Deduplication via hash).
    *   `sentiment_analyses` : Historique complet des analyses et scores.
    *   `news_sources` : Monitoring de la santé des sources.
*   **Caching Intelligent** : TTL de 2 heures pour éviter les appels API/Scraping redondants.

### 2. Le Moteur d'Analyse (Core Logic)
Le cœur du système est l'agent `SentimentAgentFinal`, conçu pour la robustesse ("No Fallback Policy").

*   **SentimentAgentFinal** :
    *   Récupère les news des dernières 48h depuis la DB.
    *   Utilise `ToonFormatter` pour convertir les données JSON en format optimisé pour l'IA (réduction de tokens).
    *   Construit le prompt pour `kilocode`.
    *   Gère les erreurs et timeouts (60s).
*   **KiloCode Integration** : Interface directe avec le CLI pour l'inférence AI.

### 3. Interface & Orchestration (CLI)
Le point d'entrée unique est `run.ts`, qui expose plusieurs modes d'opération.

*   **Mode Analyze** (`--analyze`) : Exécution unique à la demande.
*   **Mode Continuous** (`--continuous`) : Boucle de monitoring (toutes les 5 min).
*   **Mode Status** (`--status`) : Diagnostic de la base de données et du cache.

---

## 🔄 Flux de Données (Pipeline)

1.  **Ingestion / Check** :
    *   Le système vérifie si le cache DB est valide (< 2h).
    *   Si invalide -> `NewsAggregator` scrape les nouvelles données -> Stockage DB.
    *   Si valide -> Récupération directe depuis DB.
2.  **Préparation** :
    *   Extraction des news pertinentes (fenêtre 48h).
    *   Formatage en **TOON** (`ToonFormatter.ts`).
    *   Création d'un fichier tampon `database.md` (pour audit/debug).
3.  **Inférence (KiloCode)** :
    *   Envoi du prompt structuré au modèle `x-ai/grok-code-fast-1`.
    *   Réception de la réponse JSON stricte.
4.  **Stockage & Affichage** :
    *   Parsing et validation du JSON (Zod).
    *   Enregistrement du résultat dans `sentiment_analyses`.
    *   Affichage formaté dans la console.

---

## 📂 Structure de Fichiers Actuelle

L'architecture est organisée pour séparer clairement la logique métier, l'accès aux données et les scripts d'exécution.

```text
/financial-analyst
│
├── /src
│   ├── /backend
│   │   ├── /agents
│   │   │   ├── SentimentAgentFinal.ts  # AGENT PRINCIPAL (Production)
│   │   │   ├── BaseAgent.ts            # Classe de base (Legacy/Shared)
│   │   │   └── ... (Autres agents en dev/legacy)
│   │   │
│   │   ├── /database
│   │   │   ├── NewsDatabaseService.ts  # Gestionnaire DB & Cache
│   │   │   └── schema_simplified.sql   # Schéma de production
│   │   │
│   │   ├── /ingestion
│   │   │   ├── NewsAggregator.ts       # Scraper multi-sources
│   │   │   ├── FmpClient.ts            # Client API FMP
│   │   │   └── FredClient.ts           # Client API FRED
│   │   │
│   │   └── /utils
│   │       └── ToonFormatter.ts        # Optimiseur de tokens
│   │
│   └── /types                          # Définitions TypeScript
│
├── run.ts                              # Point d'entrée CLI principal
├── create_database.ts                  # Script d'init DB
├── fix_database.ts                     # Utilitaires de maintenance
├── .env                                # Configuration
└── package.json
```

---

## ⚙️ Configuration Requise

*   **KiloCode** : Configuré avec le modèle `x-ai/grok-code-fast-1`.
*   **PostgreSQL** : Instance locale ou distante accessible.
*   **Node.js** : v18+.

## 🛠️ Stack Technique

*   **Langage** : TypeScript.
*   **AI Engine** : KiloCode CLI + x-ai/grok-code-fast-1.
*   **Database** : PostgreSQL (Driver `pg`).
*   **Format d'échange** : JSON (Interne) / TOON (Vers AI).
