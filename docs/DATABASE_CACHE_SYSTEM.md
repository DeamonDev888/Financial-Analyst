# Système de Cache Intelligents pour le Sentiment Agent

## 🎯 Objectif

Le système de cache intelligent permet au **SentimentAgent** d'éviter de scraper les sources de news à chaque exécution, ce qui :

- ⚡ **Réduit le temps de réponse** de 30s à 3-5s
- 🌐 **Diminue la charge** sur les sites sources
- 💾 **Conserve l'historique** des analyses de sentiment
- 📊 **Permet l'analyse** des tendances temporelles

## 🏗️ Architecture

### Composants Principaux

1. **NewsDatabaseService** - Service de base de données
   - PostgreSQL comme backend
   - Cache intelligent avec TTL
   - Gestion des erreurs de sources
   - Nettoyage automatique des anciennes données

2. **SentimentAgent (amélioré)** - Agent avec cache
   - Vérification automatique du cache
   - Mode fallback si base de données indisponible
   - Rafraîchissement forcé optionnel

3. **Refresh Scripts** - Scripts de gestion
   - `refresh_news_cache.ts` - Gestion intelligente du cache
   - Options de rafraîchissement et nettoyage

## 🚀 Utilisation

### Analyse de Sentiment avec Cache

```bash
# Analyse normale (utilise le cache si disponible)
npm run sentiment

# Force le rafraîchissement du cache
npm run sentiment:force
```

### Gestion du Cache

```bash
# Vérifier l'état du cache et afficher les statistiques
npm run db:stats

# Rafraîchir le cache si nécessaire (intelligent)
npm run refresh

# Forcer le rafraîchissement complet
npm run refresh:force

# Rafraîchir et nettoyer les anciennes données
npm run refresh:cleanup

# Afficher les options disponibles
npm run refresh --help
```

### Configuration de la Base de Données

1. **Copier le fichier d'environnement** :
   ```bash
   cp .env.example .env
   ```

2. **Configurer PostgreSQL** :
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=financial_analyst
   DB_USER=postgres
   DB_PASSWORD=votre_mot_de_passe
   ```

3. **Initialiser la base de données** :
   ```bash
   npm run db:init
   ```

## 📊 Structure des Données

### Tables Principales

#### `news_items`
Stockage des nouvelles brutes et traitées
```sql
- id (UUID)
- title, url, source
- published_at, scraped_at
- sentiment, confidence
- keywords (JSONB)
- market_hours
- processing_status
```

#### `sentiment_analyses`
Historique des analyses de sentiment
```sql
- id, analysis_date
- overall_sentiment, score
- risk_level, confidence
- catalysts, summary
- news_count, sources_analyzed
```

#### `news_sources`
État des sources de scraping
```sql
- name, rss_url
- last_scraped_at, last_success_at
- success_count, error_count
- is_active, health_status
```

### Vues Optimisées

- `latest_news` - Nouvelles des 7 derniers jours
- `daily_news_summary` - Résumés quotidiens par source
- `source_performance` - Performance des sources

## ⚙️ Configuration

### Variables d'Environnement

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_analyst
DB_USER=postgres
DB_PASSWORD=*****

# Cache
NEWS_CACHE_HOURS=2          # Période de fraîcheur du cache
NEWS_MAX_ITEMS_PER_SOURCE=50 # Limite par source

# Performance
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT_MS=2000
```

### Modes de Fonctionnement

#### 🟢 **Mode Cache (par défaut)**
- Vérifie si le cache est frais (< 2h)
- Utilise les données existantes si disponibles
- Temps de réponse : 3-5 secondes

#### 🟡 **Mode Mixte**
- Cache stale → scrape + mise à jour cache
- Première exécution → scrape + création cache
- Temps de réponse : 10-15 secondes

#### 🔴 **Mode Fallback**
- Base de données indisponible
- Scrape systématique
- Temps de réponse : 20-30 secondes

## 📈 Performance

### Avantages du Cache

| Métrique | Sans Cache | Avec Cache |
|----------|------------|------------|
| Temps de réponse | 20-30s | 3-5s |
| Requêtes HTTP | ~30 par analyse | 0 (cache fraîs) |
| Charge CPU | Élevée | Faible |
| Historique | Non | Oui |

### Stratégie de Rafraîchissement

- **Automatique** : Cache frais < 2h
- **Intelligent** : Uniquement si nécessaire
- **Forcé** : `--force` pour rafraîchissement manuel
- **Nettoyage** : Auto-suppression > 30 jours

## 🔧 Personnalisation

### Ajouter des Sources de News

1. Mettre à jour `NewsAggregator.ts`
2. Ajouter la source dans `schema.sql`
3. Implémenter la méthode de scraping

```sql
INSERT INTO news_sources (name, rss_url, scrape_interval_minutes)
VALUES ('NewSource', 'https://example.com/rss.xml', 60);
```

### Modifier la Logique de Cache

```typescript
// Dans SentimentAgent.ts
const cacheFresh = await this.dbService.isCacheFresh(4); // 4h au lieu de 2h
```

### Adapter le Nettoyage

```bash
# Garder 60 jours au lieu de 30
npm run refresh --cleanup --days=60
```

## 🛠️ Dépannage

### Problèmes Communs

1. **"Database not connected"**
   ```bash
   # Vérifier la configuration .env
   npm run db:init
   ```

2. **"Cache always stale"**
   ```bash
   # Vérifier l'horloge système
   # Vérifier la configuration NEWS_CACHE_HOURS
   npm run db:stats
   ```

3. **"No data in cache"**
   ```bash
   # Forcer le premier remplissage
   npm run refresh:force
   ```

### Logs et Monitoring

```bash
# Logs détaillés du cache
DEBUG=cache npm run sentiment

# Monitoring des sources
npm run refresh --stats
```

### Réinitialisation Complète

```bash
# Nettoyer et réinitialiser
npm run refresh:cleanup --force
npm run db:init
npm run sentiment:force
```

## 📚 API Reference

### NewsDatabaseService

```typescript
class NewsDatabaseService {
    async testConnection(): Promise<boolean>
    async isCacheFresh(maxAgeHours: number): Promise<boolean>
    async getNewsForAnalysis(hoursBack: number): Promise<DatabaseNewsItem[]>
    async saveNewsItems(newsItems: NewsItem[]): Promise<number>
    async getDatabaseStats(): Promise<any>
    async cleanupOldData(daysToKeep: number): Promise<void>
}
```

### SentimentAgent (avec cache)

```typescript
class SentimentAgent {
    async analyzeMarketSentiment(forceRefresh?: boolean): Promise<any>
    async refreshCache(): Promise<void>
    async getDatabaseStats(): Promise<any>
    async cleanupOldData(daysToKeep?: number): Promise<void>
}
```

---

*Ce système de cache intelligent optimise considérablement les performances du SentimentAgent tout en maintenant la qualité des analyses grâce à une gestion intelligente des données fraîches.*