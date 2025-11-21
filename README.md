<div align="center">
  <img src="assets/logo.png" alt="Financial Analyst Logo" width="250" style="border-radius: 15px; box-shadow: 0 0 20px rgba(0, 122, 204, 0.5);">

  # 🚀 Financial Analyst & ES Futures Trading System

  **Système Complet d'Analyse de Marché avec IA, Cache Intelligent et Base de Données Avancée**

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![KiloCode AI](https://img.shields.io/badge/AI-KiloCode%20%7C%20x--ai-FF6600?style=for-the-badge)](https://x.ai/)
  [![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

  <p align="center">
    <a href="#-démarrage-rapide">Démarrage</a> •
    <a href="#-architecture-complète">Architecture</a> •
    <a href="#-agents-intelligents">Agents</a> •
    <a href="#-système-de-cache">Cache</a> •
    <a href="#bibliothèque- financière">Ressources</a> •
    <a href="#-documentation-complète">Documentation</a>
  </p>
</div>

---

## 🚀 Démarrage Rapide

### Installation & Configuration

```bash
# Cloner le projet
git clone https://github.com/Terlou06/Financial-Analyst.git
cd Financial-Analyst

# Installation des dépendances
npm install

# Configuration de la base de données
cp .env.example .env
# Éditer .env avec vos identifiants PostgreSQL

# Initialisation de la base de données
npm run db:init

# Lancer la première analyse (avec cache)
npm run sentiment
```

### Commandes Essentielles

```bash
# Analyse de sentiment avec cache intelligent
npm run sentiment           # Utilise le cache si frais
npm run sentiment:force     # Force le scraping

# Gestion du cache
npm run refresh             # Rafraîchissement intelligent
npm run refresh:force       # Force le rafraîchissement
npm run db:stats            # Statistiques de la base de données

# Analyse de données
npm run analyze:week        # Analyse des 7 derniers jours
npm run analyze:month       # Analyse du mois
npm run export:csv          # Exporter en CSV
```

---

## 📈 Performances & Avantages

### ⚡ Cache Intelligent (80%+ d'amélioration)
- **Temps de réponse** : 3-5s (cache) vs 30s (scraping)
- **Zéro requête HTTP** quand le cache est frais
- **Historique** des analyses et tendances
- **Mode fallback** si base indisponible

### 🧠 Analyse de Sentiment Avancée
- **3 sources** : ZeroHedge, CNBC, FinancialJuice
- **IA KiloCode** pour l'analyse de sentiment
- **Classification** : Bullish/Bearish/Neutral avec score
- **Catalysts** et niveau de risque

### 📊 Base de Données Complète
- **PostgreSQL** optimisé avec indexes
- **Nettoyage** automatique des anciennes données
- **Monitoring** de santé des sources
- **Export** CSV pour analyses externes

---

## 🏗 Architecture Complète

Ce projet combine une bibliothèque financière complète avec un système d'analyse de marché intelligent, utilisant un cache avancé pour des performances optimales.

## 🤖 Agent d'Analyse ES Futures (Automated Analyst)

L'objectif principal est de développer un agent autonome capable d'agréger des données économiques en temps réel, d'analyser le sentiment du marché et de générer des rapports de trading structurés avec des prédictions de prix.

## 🏗️ Architecture & Tech Stack

### 🧠 Agents Intelligents
*   **SentimentAgent** : Analyse de sentiment avec cache intelligent
*   **BaseAgent** : Infrastructure commune pour tous les agents
*   **IA KiloCode** : Modèle `x-ai/grok-code-fast-1` pour l'analyse

### 💾 Système de Cache Avancé
*   **PostgreSQL** : Base de données optimisée avec indexes
*   **Cache TTL** : 2 heures par défaut, configurable
*   **Mode Fallback** : Fonctionne sans base de données
*   **Monitoring** : Santé des sources et erreurs

### 📡 Sources de Données & APIs

#### 📰 News & Sentiment (avec cache)
1.  **ZeroHedge** (RSS Feed)
    *   *Sentiment de marché alternatif*
    *   *News macro-économiques en temps réel*
    *   *TTL Cache* : 60 minutes

2.  **CNBC** (RSS Feed)
    *   *News financières traditionnelles*
    *   *Couverture ES Futures*
    *   *TTL Cache* : 60 minutes

3.  **FinancialJuice** (Simulation)
    *   *News de marché synthétiques*
    *   *Données de test et démo*
    *   *TTL Cache* : 120 minutes

#### 📊 Données Économiques (prévu)
*   **FRED API** : PIB, Inflation, Emploi, Taux d'intérêt
*   **BLS API** : CPI, NFP, Chômage
*   **FMP API** : Courbe des taux, Treasury Yields
*   **AlphaVantage** : Earnings, Estimations EPS

### 🚀 Pipeline de Traitement
```
Sources News → Cache DB → SentimentAgent → IA KiloCode → Analyse JSON → Dashboard
     ↓              ↓              ↓              ↓
  Scraping     PostgreSQL     Classification  Prédictions
  + Cache       Optimisé      par heure       de prix
```

### 📋 Format d'Analyse de Sentiment

L'agent génère une analyse structurée en JSON :

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

## 💾 Système de Cache Intelligent

### 🎯 Objectif du Cache
- **⚡ Performance** : Réduction du temps de 30s → 3-5s (80%+)
- **🌐 Économie** : Zéro requête HTTP sur cache frais
- **📊 Historique** : Conservation des tendances temporelles
- **🛡️ Fiabilité** : Mode fallback si base indisponible

### 🔄 Logique de Cache
```
Cache FRESH (< 2h)  →  Utiliser données existantes (3-5s)
Cache STALE (≥ 2h)  →  Scraper + mise à jour cache (10-15s)
Pas de cache/BDD    →  Scrape systématique (20-30s)
```

### 📊 Base de Données PostgreSQL
- **news_items** : Nouvelles brutes et traitées
- **sentiment_analyses** : Historique des analyses
- **news_sources** : Santé et performance des sources
- **Vues optimisées** : latest_news, daily_news_summary

### 🧹 Gestion Automatique
- **Nettoyage** : Auto-suppression > 30 jours
- **Monitoring** : Santé des sources en temps réel
- **Indexes** : Optimisés pour les requêtes fréquentes

---

## 📚 Bibliothèque Financière (LIVRE FINANCE)

Une collection exceptionnelle de **250+ livres** financiers organisés par spécialités pour former des traders complets.

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

#### 🎯 **Autres Collections Spécialisées**
- **Bull and Bear Market Collection** (15+ livres)
- **Hedge Fund Collection** (10+ livres)
- **Stock Market 101 Collection** (50+ livres)
- **Fundamental Analysis Collection** (5+ livres)
- **Volatility & VIX Collection** (8+ livres)
- **Margin Trading Collection** (1+ livre)

### 🎓 Parcours d'Apprentissage Recommandé

1. **Débutant** → Stock Market 101 → Understanding Wall Street
2. **Intermédiaire** → Technical Analysis → Risk Management
3. **Avancé** → Options Trading → Futures & Forex
4. **Expert** → Hedge Fund Strategies → Long Term Investing

---

## 📚 Documentation Complète

### 📖 Guides Techniques
- [**DATABASE_CACHE_SYSTEM.md**](docs/DATABASE_CACHE_SYSTEM.md) - Système de cache intelligent
- [**NEWS_DATA_SYSTEM.md**](docs/NEWS_DATA_SYSTEM.md) - Traitement des données de marché
- [**SENTIMENT_AGENT.md**](docs/SENTIMENT_AGENT.md) - Documentation complète du SentimentAgent *(prochainement)*

### 🏗️ Architecture
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) - Architecture technique du système
- Base de données complète avec schéma SQL optimisé
- Système d'agents IA modular et extensible

### 🚀 Scripts & Outils
- Scripts d'analyse et d'export CSV
- Gestionnaire de cache intelligent
- Outils de monitoring et statistiques

---

## 🤝 Contribution & Développement

### 🔧 Environnement de Développement
```bash
npm run dev          # Mode développement
npm run build        # Build TypeScript
npm run test         # Tests unitaires
```

### 📊 Monitoring
```bash
npm run db:stats     # Statistiques DB
npm run refresh      # Gestion cache
npm run pipeline     # Pipeline complet
```

### 🌟 Fonctionnalités Futures
- [ ] Dashboard web en temps réel
- [ ] Intégration Telegram Bot
- [ ] Analyse technique automatique
- [ ] Backtesting de stratégies
- [ ] API REST publique

---

## 📄 Licence

Ce projet est sous licence **ISC** - voir [LICENSE](LICENSE) pour les détails.

---

**🚀 Projet actif en développement continu avec IA KiloCode (x-ai) et architecture PostgreSQL avancée**