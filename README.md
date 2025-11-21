<div align="center">
  <img src="assets/logo.png" alt="Financial Analyst Logo" width="250" style="border-radius: 15px; box-shadow: 0 0 20px rgba(0, 122, 204, 0.5);">

  # 🚀 Financial Analyst & ES Futures Trading System

  **Systeme Complet d'Analyse de Marche avec IA, Cache Intelligent et Base de Donnees Avancee**

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![KiloCode AI](https://img.shields.io/badge/AI-KiloCode%20%7C%20x--ai-FF6600?style=for-the-badge)](https://x.ai/)
  [![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

  <p align="center">
    <a href="#-demarrage-rapide">Demarrage</a> •
    <a href="#-architecture-complete">Architecture</a> •
    <a href="#-agents-intelligents">Agents</a> •
    <a href="#-systeme-de-cache">Cache</a> •
    <a href="#bibliotheque-financiere">Ressources</a> •
    <a href="#-documentation-complete">Documentation</a>
  </p>
</div>

---

## 🚀 Demarrage Rapide

### Installation & Configuration

```bash
# Cloner le projet
git clone https://github.com/Terlou06/Financial-Analyst.git
cd Financial-Analyst

# Installation des dependances
npm install

# Configuration de la base de donnees
cp .env.example .env
# Editer .env avec vos identifiants PostgreSQL

# Initialisation de la base de donnees
npm run db:init

# Lancer la premiere analyse (avec cache)
npm run sentiment
```

### Commandes Essentielles

```bash
# Analyse de sentiment avec cache intelligent
npm run sentiment           # Utilise le cache si frais
npm run sentiment:force     # Force le scraping

# Gestion du cache
npm run refresh             # Rafraichissement intelligent
npm run refresh:force       # Force le rafraichissement
npm run db:stats            # Statistiques de la base de donnees

# Analyse de donnees
npm run analyze:week        # Analyse des 7 derniers jours
npm run analyze:month       # Analyse du mois
npm run export:csv          # Exporter en CSV
```

---

## 📈 Performances & Avantages

### ⚡ Cache Intelligent (80%+ d'amelioration)
- **Temps de reponse** : 3-5s (cache) vs 30s (scraping)
- **Zero requete HTTP** quand le cache est frais
- **Historique** des analyses et tendances
- **Mode fallback** si base indisponible

### 🧠 Analyse de Sentiment Avancee
- **3 sources** : ZeroHedge, CNBC, FinancialJuice
- **IA KiloCode** pour l'analyse de sentiment
- **Classification** : Bullish/Bearish/Neutral avec score
- **Catalysts** et niveau de risque

### 📊 Base de Donnees Complete
- **PostgreSQL** optimise avec indexes
- **Nettoyage** automatique des anciennes donnees
- **Monitoring** de sante des sources
- **Export** CSV pour analyses externes

---

## 🏗 Architecture Complete

Ce projet combine une bibliotheque financiere complete avec un systeme d'analyse de marche intelligent, utilisant un cache avance pour des performances optimales.

## 🤖 Agent d'Analyse ES Futures (Automated Analyst)

L'objectif principal est de developper un agent autonome capable d'agreger des donnees economiques en temps reel, d'analyser le sentiment du marche et de generer des rapports de trading structures avec des predictions de prix.

## 🏗 Architecture & Tech Stack

### 🧠 Agents Intelligents
*   **SentimentAgent** : Analyse de sentiment avec cache intelligent
*   **BaseAgent** : Infrastructure commune pour tous les agents
*   **IA KiloCode** : Modele `x-ai/grok-code-fast-1` pour l'analyse

### 💾 Systeme de Cache Avance
*   **PostgreSQL** : Base de donnees optimisee avec indexes
*   **Cache TTL** : 2 heures par defaut, configurable
*   **Mode Fallback** : Fonctionne sans base de donnees
*   **Monitoring** : Sante des sources et erreurs

### 📡 Sources de Donnees & APIs

#### 📰 News & Sentiment (avec cache)
1.  **ZeroHedge** (RSS Feed)
    *   *Sentiment de marche alternatif*
    *   *News macro-economiques en temps reel*
    *   *TTL Cache* : 60 minutes

2.  **CNBC** (RSS Feed)
    *   *News financieres traditionnelles*
    *   *Couverture ES Futures*
    *   *TTL Cache* : 60 minutes

3.  **FinancialJuice** (Simulation)
    *   *News de marche synthetiques*
    *   *Donnees de test et demo*
    *   *TTL Cache* : 120 minutes

#### 📊 Donnees Economiques (prevu)
*   **FRED API** : PIB, Inflation, Emploi, Taux d'interet
*   **BLS API** : CPI, NFP, Chomage
*   **FMP API** : Courbe des taux, Treasury Yields
*   **AlphaVantage** : Earnings, Estimations EPS

### 🚀 Pipeline de Traitement
```
Sources News → Cache DB → SentimentAgent → IA KiloCode → Analyse JSON → Dashboard
     ↓              ↓              ↓              ↓
  Scraping     PostgreSQL     Classification  Predictions
  + Cache       Optimise      par heure       de prix
```

### 📋 Format d'Analyse de Sentiment

L'agent genere une analyse structuree en JSON :

```json
{
  "sentiment": "BULLISH",
  "score": 75,
  "catalysts": [
    "Fed Rate Cut Announcement",
    "Strong Tech Earnings",
    "Declining Inflation Data"
  ],
  "risk_level": "LOW",
  "summary": "Market sentiment is strongly bullish due to dovish Fed signals and robust corporate earnings.",
  "data_source": "database_cache",
  "news_count": 25
}
```

---

## 💾 Systeme de Cache Intelligent

### 🎯 Objectif du Cache
- **⚡ Performance** : Reduction du temps de 30s → 3-5s (80%+)
- **🌐 Economie** : Zero requete HTTP sur cache frais
- **📊 Historique** : Conservation des tendances temporelles
- **🛡️ Fiabilite** : Mode fallback si base indisponible

### 🔄 Logique de Cache
```
Cache FRESH (< 2h)  →  Utiliser donnees existantes (3-5s)
Cache STALE (≥ 2h)  →  Scraper + mise a jour cache (10-15s)
Pas de cache/BDD    →  Scrape systematique (20-30s)
```

### 📊 Base de Donnees PostgreSQL
- **news_items** : Nouvelles brutes et traitees
- **sentiment_analyses** : Historique des analyses
- **news_sources** : Sante et performance des sources
- **Vues optimisees** : latest_news, daily_news_summary

### 🧹 Gestion Automatique
- **Nettoyage** : Auto-suppression > 30 jours
- **Monitoring** : Sante des sources en temps reel
- **Indexes** : Optimises pour les requetes frequentes

---

## 📚 Bibliotheque Financiere (LIVRE FINANCE)

Une collection exceptionnelle de **250+ livres** financiers organises par specialites pour former des traders complets.

### 📁 Collections Disponibles

#### 💼 **Day Trading Collection** (40+ livres)
- *18 Trading Champions Share Their Keys To Top Trading Profits*
- *Trading in the Zone* par Mark Douglas
- *A Complete Guide to Day Trading*
- *Master Traders: Strategies for Superior Returns*
- Et bien plus...

#### 📈 **Technical Analysis Collection** (40+ livres)
- *Technical Analysis of the Financial Markets* par John J. Murphy
- *Bollinger on Bollinger Bands* par John Bollinger
- *Mastering Elliott Wave Principle*
- *Candlestick Charting Techniques*
- *Point and Figure Charting*

#### 🏦 **Long Term Investing Collection** (40+ livres)
- *The Intelligent Investor* par Benjamin Graham
- *One Up On Wall Street* par Peter Lynch
- *The Little Book of Common Sense Investing* par John Bogle
- *Buffett: The Making of an American Capitalist*
- *Big Debt Crises* par Ray Dalio

#### ⚡ **Options Trading Collection** (25+ livres)
- *Option Volatility and Pricing* par Sheldon Natenberg
- *Options as a Strategic Investment* par Lawrence McMillan
- *Trading Options Greeks* par Dan Passarelli
- *The Options Course* par George Fontanills

#### 💰 **Futures and Forex Collection** (20+ livres)
- *Getting Started in Futures*
- *Successful Foreign Exchange Dealing*
- *Currency Trading Strategies*
- *Digital Gold: Bitcoin and Cryptocurrency*

#### 🛡️ **Risk Management Collection** (10+ livres)
- *Fundamentals of Risk Management*
- *Financial Risk Management*
- *Stock Market Math: Essential Formulas*

#### 🎯 **Autres Collections Specialisees**
- **Bull and Bear Market Collection** (15+ livres)
- **Hedge Fund Collection** (10+ livres)
- **Stock Market 101 Collection** (50+ livres)
- **Fundamental Analysis Collection** (5+ livres)
- **Volatility & VIX Collection** (8+ livres)
- **Margin Trading Collection** (1+ livre)

### 🎓 Parcours d'Apprentissage Recommande

1. **Debutant** → Stock Market 101 → Understanding Wall Street
2. **Intermediaire** → Technical Analysis → Risk Management
3. **Avance** → Options Trading → Futures & Forex
4. **Expert** → Hedge Fund Strategies → Long Term Investing

---

## 📚 Documentation Complete

### 📖 Guides Techniques
- [**DATABASE_CACHE_SYSTEM.md**](docs/DATABASE_CACHE_SYSTEM.md) - Systeme de cache intelligent
- [**NEWS_DATA_SYSTEM.md**](docs/NEWS_DATA_SYSTEM.md) - Traitement des donnees de marche
- [**SENTIMENT_AGENT.md**](docs/SENTIMENT_AGENT.md) - Documentation complete du SentimentAgent

### 🏗️ Architecture
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) - Architecture technique du systeme
- Base de donnees complete avec schema SQL optimise
- Systeme d'agents IA modular et extensible

### 🚀 Scripts & Outils
- Scripts d'analyse et d'export CSV
- Gestionnaire de cache intelligent
- Outils de monitoring et statistiques

---

## 🤝 Contribution & Developpement

### 🔧 Environnement de Developpement
```bash
npm run dev          # Mode developpement
npm run build        # Build TypeScript
npm run test         # Tests unitaires
```

### 📊 Monitoring
```bash
npm run db:stats     # Statistiques DB
npm run refresh      # Gestion cache
npm run pipeline     # Pipeline complet
```

### 🌟 Fonctionnalites Futures
- [ ] Dashboard web en temps reel
- [ ] Integration Telegram Bot
- [ ] Analyse technique automatique
- [ ] Backtesting de strategies
- [ ] API REST publique

---

## 📄 Licence

Ce projet est sous licence **ISC** - voir [LICENSE](LICENSE) pour les details.

---

**🚀 Projet actif en developpement continu avec IA KiloCode (x-ai) et architecture PostgreSQL avancee**