# SentimentAgent Documentation

## 🎯 Overview

Le **SentimentAgent** est un agent d'intelligence artificielle spécialisé dans l'analyse de sentiment du marché financier pour les ES Futures (S&P 500). Il combine plusieurs sources de news avec un système de cache intelligent et une IA pour générer des analyses de sentiment structurées.

## 🏗 Architecture

### Composants Principaux

```
SentimentAgent
├── NewsAggregator (Scraping des sources)
├── NewsDatabaseService (Cache intelligent)
├── ToonFormatter (Formatage des données)
└── BaseAgent (Infrastructure IA)
```

### Flux de Données

```
1. Sources News → 2. Vérification Cache → 3. Scraping/Cache → 4. Formatage → 5. Analyse IA
       ↓                ↓                     ↓              ↓           ↓
   ZeroHedge        PostgreSQL            NewsData     TOON       JSON
   CNBC            (fraîcheur < 2h)       Processing   Format    Structuré
   FinancialJuice   (mode fallback)       (mots-clés)  (pipe)   Sentiment
```

## 🚀 Fonctionnalités

### 🧠 Analyse de Sentiment IA

L'agent utilise le modèle **KiloCode (x-ai/grok-code-fast-1)** pour analyser les news et générer :

- **Sentiment global** : Bullish/Bearish/Neutral avec score (-100 à +100)
- **Catalysts principaux** : Top 3 facteurs d'influence du marché
- **Niveau de risque** : LOW/MEDIUM/HIGH
- **Résumé explicatif** : Analyse concise du sentiment actuel
- **Confidence** : Niveau de confiance dans l'analyse

### 💾 Cache Intelligent

#### Performance Optimisée
- **Cache frais** : 3-5 secondes (données existantes)
- **Cache stale** : 10-15 secondes (scrape + mise à jour)
- **Fallback mode** : 20-30 secondes (scrape systématique)

#### Stratégie de Cache
```typescript
// TTL par défaut : 2 heures configurable
const cacheFresh = await this.dbService.isCacheFresh(2);

if (cacheFresh && !forceRefresh) {
    // Utiliser les données du cache
    return await this.analyzeWithCache();
} else {
    // Scraper et mettre à jour le cache
    return await this.scrapeAndAnalyze();
}
```

### 📊 Sources de Données

#### 📰 ZeroHedge (RSS Feed)
- **Type** : News financières alternatives
- **Fréquence** : Mise à jour continue
- **Sentiment** : Contrarian, macro-économie
- **Cache TTL** : 60 minutes

#### 📺 CNBC (RSS Feed)
- **Type** : News financières traditionnelles
- **Fréquence** : Mise à jour continue
- **Couverture** : ES Futures, marchés actions
- **Cache TTL** : 60 minutes

#### 🏦 FinancialJuice (Simulation)
- **Type** : News synthétiques
- **Usage** : Tests et démonstrations
- **Données** : Réalistes mais simulées
- **Cache TTL** : 120 minutes

## 📋 Utilisation

### Installation

```bash
# Dépendances requises
npm install @types/pg pg axios cheerio

# Configuration base de données
cp .env.example .env
# Configurer DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
```

### Usage de Base

```typescript
import { SentimentAgent } from './agents/SentimentAgent';

const agent = new SentimentAgent();

// Analyse standard (avec cache)
const analysis = await agent.analyzeMarketSentiment();
console.log(analysis);

// Force le rafraîchissement
const freshAnalysis = await agent.analyzeMarketSentiment(true);

// Nettoyer les ressources
await agent.cleanup();
```

### Exemple de Résultat

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

## 🔧 Configuration

### Variables d'Environnement

```env
# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_analyst
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe

# Configuration du cache
NEWS_CACHE_HOURS=2          # Période de fraîcheur du cache
NEWS_MAX_ITEMS_PER_SOURCE=50 # Limite par source

# Performance
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT_MS=2000
```

### Personnalisation

#### Modification du TTL de Cache

```typescript
// Dans SentimentAgent.ts
const cacheFresh = await this.dbService.isCacheFresh(4); // 4 heures
```

#### Ajout de Sources de News

```typescript
// Dans NewsAggregator.ts
async fetchNewSource(): Promise<NewsItem[]> {
    // Implémenter le scraping pour la nouvelle source
    const response = await axios.get('https://example.com/rss.xml');
    // Parser et retourner les news
    return newsItems;
}
```

#### Adaptation du Prompt IA

```typescript
// Dans SentimentAgent.ts, méthode performSentimentAnalysis
const prompt = `
You are a Market Sentiment Analyst for ES Futures.

Customize your analysis criteria here...

JSON STRUCTURE:
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "score": number, // -100 to 100
  "catalysts": ["string", "string", "string"],
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "summary": "Brief explanation"
}
`;
```

## 📊 Monitoring & Statistiques

### Statistiques de Base de Données

```typescript
const agent = new SentimentAgent();

// Obtenir les statistiques
const stats = await agent.getDatabaseStats();
console.log(stats);

// Format de réponse
{
  news: {
    total_news: 1250,
    today_news: 45,
    latest_news: "2024-01-15T15:30:00Z",
    bullish: 65,
    bearish: 32,
    neutral: 48
  },
  sources: [
    {
      name: "ZeroHedge",
      success_count: 156,
      error_count: 3,
      is_active: true,
      last_scraped_at: "2024-01-15T15:30:00Z"
    }
  ],
  analyses: {
    total_analyses: 89,
    latest_analysis: "2024-01-15T14:00:00Z"
  }
}
```

### Monitoring des Sources

```typescript
// État de santé des sources
await agent.refreshCache(); // Affiche l'état pendant le rafraîchissement

// Sortie attendue
[sentiment-agent] Database cache status: FRESH
[sentiment-agent] Using 25 cached news items
[sentiment-agent] Analyzing 25 news items (from cache)...
[sentiment-agent] Analysis saved to database
```

## 🛠 Gestion du Cache

### Commandes CLI

```bash
# Statistiques du cache
npm run db:stats

# Rafraîchissement intelligent
npm run refresh

# Forcer le rafraîchissement
npm run refresh:force

# Nettoyer les anciennes données
npm run refresh:cleanup
```

### Nettoyage Manuel

```typescript
const agent = new SentimentAgent();

// Nettoyer les données de plus de 30 jours
await agent.cleanupOldData(30);

// Nettoyer les données de plus de 7 jours
await agent.cleanupOldData(7);
```

## 🔍 Analyse Détaillée

### Processus d'Analyse

1. **Collecte des Données**
   - Vérification du cache
   - Scraping des sources si nécessaire
   - Nettoyage et normalisation

2. **Extraction de Features**
   - Mots-clés financiers (fed, inflation, etc.)
   - Classification par heures de marché
   - Détection de sentiment de base

3. **Formatage TOON**
   - Conversion en format TOON pour l'IA
   - Structure optimisée pour le parsing

4. **Analyse IA**
   - Envoi à KiloCode
   - Réception du JSON structuré
   - Validation du format

5. **Sauvegarde**
   - Stockage en base de données
   - Mise à jour du cache
   - Archivage de l'historique

### Mots-Clés Extraits

Le système extrait automatiquement 50+ mots-clés financiers :

```typescript
const marketKeywords = [
    // Politique monétaire
    'fed', 'federal reserve', 'powell', 'rate', 'inflation', 'cpi',

    // Indices et marchés
    's&p', 'nasdaq', 'dow', 'futures', 'volatility', 'vix',

    // Secteurs
    'tech', 'energy', 'financials', 'healthcare', 'consumer',

    // Actions de marché
    'rally', 'sell-off', 'crash', 'bull', 'bear', 'volatile',

    // Entreprises
    'apple', 'microsoft', 'google', 'amazon', 'tesla'
];
```

### Classification par Heures de Marché

```typescript
enum MarketHours {
    PRE_MARKET = '4:00-9:30 EST',
    MARKET = '9:30-16:00 EST',
    AFTER_HOURS = '16:00-20:00 EST',
    EXTENDED = '20:00-4:00 EST'
}
```

## 🐛 Dépannage

### Problèmes Communs

#### "Database not connected"
```bash
# Solution
npm run db:init
# Vérifier la configuration .env
# Confirmer que PostgreSQL fonctionne
```

#### "Cache always stale"
```bash
# Solution
npm run db:stats
# Vérifier l'horloge système
# Confirmer la configuration NEWS_CACHE_HOURS
```

#### "No news data available"
```bash
# Solution
npm run refresh:force
# Vérifier la connectivité internet
# Tester les sources individuellement
```

### Mode Débogage

```typescript
// Activer les logs détaillés
DEBUG=cache npm run sentiment
DEBUG=scraping npm run sentiment
DEBUG=analysis npm run sentiment

// Logs personnalisés
const agent = new SentimentAgent();
agent.debugMode = true; // Active les logs verbeux
```

### Réinitialisation Complète

```bash
# 1. Nettoyer le cache
npm run refresh:cleanup

# 2. Réinitialiser la base de données
npm run db:init

# 3. Forcer une nouvelle analyse
npm run sentiment:force
```

## 📈 Performance

### Métriques Clés

| Métrique | Sans Cache | Avec Cache | Amélioration |
|----------|------------|------------|--------------|
| Temps de réponse | 20-30s | 3-5s | 80%+ |
| Requêtes HTTP | ~30 | 0 | 100% |
| Charge CPU | Élevée | Faible | 70% |
| Utilisation réseau | Continue | Minimale | 90% |

### Optimisations

1. **Database Indexing**
   - Index sur published_at, source, sentiment
   - Vues materialisées pour les requêtes fréquentes

2. **Connection Pooling**
   - Pool de 20 connexions maximum
   - Timeout de 2 secondes

3. **Batch Processing**
   - Insertions par lots de 10 items
   - Transactions optimisées

4. **Memory Management**
   - Nettoyage automatique des objets
   - Limitation de la mémoire utilisée

## 🔮 Évolutions Futures

### Améliorations Prévues

- [ ] **Multi-langues** : Support des news en plusieurs langues
- [ ] **Sentiment temporel** : Analyse d'évolution du sentiment
- [ ] **Classification thématique** : Regroupement par secteurs
- [ ] **Alertes temps réel** : Notifications sur changements importants
- [ ] **API REST** : Interface pour intégration externe

### Extensions Possibles

- [ ] **Twitter/X Integration** : Social media sentiment
- [ ] **Options Flow Analysis** : Analyse des flux d'options
- [ ] **Technical Analysis** : Combinaison avec indicateurs techniques
- [ ] **Machine Learning** : Amélioration continue des modèles

## 📚 Ressources Complémentaires

- [DATABASE_CACHE_SYSTEM.md](DATABASE_CACHE_SYSTEM.md) - Documentation du cache
- [NEWS_DATA_SYSTEM.md](NEWS_DATA_SYSTEM.md) - Traitement des données
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture système

---

*Le SentimentAgent représente une solution moderne d'analyse de sentiment, combinant performance, fiabilité et intelligence artificielle pour fournir des insights de marché pertinents et en temps réel.*