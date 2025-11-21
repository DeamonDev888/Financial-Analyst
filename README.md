# Financial Analyst & ES Futures Agent

Ce projet combine une bibliothèque de ressources financières approfondies avec un agent d'analyse automatisé pour le trading des futures ES (S&P 500).

## 🤖 Agent d'Analyse ES Futures (Automated Analyst)

L'objectif principal est de développer un agent autonome capable d'agréger des données économiques en temps réel, d'analyser le sentiment du marché et de générer des rapports de trading structurés avec des prédictions de prix.

### 🛠 Architecture & Tech Stack
*   **Cerveau AI** : Modèle `x-ai/grok-code-fast-1` via **KiloCode CLI**.
*   **Système** : Backend Node.js + Frontend (WebSockets).
*   **Base de Données** : PostgreSQL (Stockage historique, Indicateurs & Prédictions).
*   **Connectivité** : API REST (Données) & Pipelines de Fichiers (AI).
*   **Sorties** : Dashboard Temps Réel, Telegram, Rapports structurés.

### 📡 Sources de Données & APIs
L'agent se connecte aux sources suivantes pour une analyse macro-économique complète :

1.  **FRED API (Federal Reserve Economic Data)**
    *   *Données* : PIB, Inflation, Emploi, Taux d'intérêt.
    *   *Usage* : Tendance macro long terme.
2.  **BLS API (Bureau of Labor Statistics)**
    *   *Données* : CPI, NFP (Non-Farm Payrolls), Chômage.
    *   *Usage* : Analyse des surprises macro (Réel vs Attendu).
3.  **FinancialModelingPrep (FMP)**
    *   *Données* : Courbe des taux (Yield Curve), Treasury Yields (1Y-30Y).
    *   *Usage* : Sentiment obligataire.
4.  **AlphaVantage**
    *   *Données* : Calendrier des résultats (Earnings), Estimations EPS.
    *   *Usage* : Impact micro-économique sur l'indice.
5.  **Sources Complémentaires (Web Scraping/Analysis)**
    *   TradingEconomics (Calendrier Économique)
    *   ZoneBourse & ZeroHedge (Sentiment & News)
    *   FinancialJuice (News en temps réel)

### 📊 Format du Rapport Journalier
L'agent génère chaque matin un rapport structuré pour la session de trading :

> **🎯 TODAY'S TREND**
> [RANGE / BULLISH / BEARISH] + Justification courte
>
> **📊 CRITICAL EVENTS**
> [Heure EST] [Événement] : Impact [FORT/MOYEN/FAIBLE] → Direction Probable [↑/↓]
>
> **⚡ MAIN CATALYSTS**
> *   Point 1
> *   Point 2
>
> **⚠️ RISKS**
> *   Risque Principal
>
> **💡 KEY ES ZONES**
> *   **Support** : [Niveau]
> *   **Résistance** : [Niveau]

---

## 📚 Base de Connaissances (LIVRE FINANCE)

Une collection de ressources pour l'analyse fondamentale et la compréhension des marchés.

### 📁 Structure des Ressources

#### 📈 STOCK MARKET CYCLE
- **An Introduction to Financial Markets (2010).pdf** - Guide complet sur les marchés financiers.

#### 💰 FUNDAMENTAL ANALYSIS
- **Mastering Fundamental Analysis.pdf** - Maîtrise de l'analyse fondamentale.
- **Mastering Fundamental Analysis2.pdf** - Guide avancé.

#### 💎 BOND
- **All About Bonds, Bond Mutual Funds, and Bond ETFs.pdf** - Guide sur les obligations.

#### 📊 ECONOMIC
- **Guide to Economic Indicators CPI.pdf** - Comprendre l'IPC et les indicateurs.

---
*Projet en développement actif : Architecture Backend/Frontend avec Agents AI KiloCode (x-ai).*