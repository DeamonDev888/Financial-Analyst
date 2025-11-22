# Commandes SQL pour pgAdmin 4 - Financial Analyst

## 🔍 Requête complète d'analyse

Copiez-collez cette requête complète dans le **Query Tool** de pgAdmin 4 pour voir toutes les données de votre application Financial Analyst :

```sql
-- ==========================================
-- ANALYSE COMPLÈTE FINALE (JSON corrigé)
-- ==========================================

-- 1. STATISTIQUES DES TABLES
SELECT
    '=== STATISTIQUES DES TABLES ===' as section,
    '' as table_name,
    '' as count,
    '' as details
UNION ALL
SELECT
    'News Items',
    'news_items',
    (SELECT COUNT(*) FROM news_items)::text,
    'Articles financiers analysés'
UNION ALL
SELECT
    'Sentiment Analyses',
    'sentiment_analyses',
    (SELECT COUNT(*) FROM sentiment_analyses)::text,
    'Analyses de sentiment réalisées'
UNION ALL
SELECT
    'Daily News Summary',
    'daily_news_summary',
    COALESCE((SELECT COUNT(*) FROM daily_news_summary), 0)::text,
    'Résumés quotidiens'
UNION ALL
SELECT
    'Latest News',
    'latest_news',
    COALESCE((SELECT COUNT(*) FROM latest_news), 0)::text,
    'Dernières news mises en cache'

ORDER BY section;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 2. DERNIÈRES ANALYSES (JSON corrigé)
SELECT
    '=== DERNIÈRES ANALYSES DE SENTIMENT ===' as info,
    overall_sentiment,
    score,
    risk_level,
    LEFT(catalysts::text, 80) || '...' as catalysts_preview,
    LEFT(summary, 100) || '...' as summary_preview,
    EXTRACT(HOUR FROM created_at) || 'h' || EXTRACT(MINUTE FROM created_at) as time
FROM sentiment_analyses
ORDER BY created_at DESC
LIMIT 10;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 3. NEWS RÉCENTES PAR SOURCE
SELECT
    '=== NEWS RÉCENTES PAR SOURCE ===' as section,
    source,
    LEFT(title, 60) || '...' as title_preview,
    EXTRACT(DAY FROM created_at) || '/' || EXTRACT(MONTH FROM created_at) as date,
    EXTRACT(HOUR FROM created_at) || 'h' as time
FROM news_items
ORDER BY created_at DESC
LIMIT 20;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 4. RÉPARTITION DES SOURCES
SELECT
    '=== RÉPARTITION DES SOURCES ===' as info,
    source,
    COUNT(*) as news_count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM news_items) * 100, 1) || '%' as percentage,
    CASE
        WHEN COUNT(*) >= 10 THEN '🔥 ACTIVE'
        WHEN COUNT(*) >= 5 THEN '⚡ MOYENNE'
        ELSE '📝 FAIBLE'
    END as activity_level
FROM news_items
GROUP BY source
ORDER BY news_count DESC;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 5. ÉVOLUTION DU SENTIMENT (par ordre chronologique)
SELECT
    '=== ÉVOLUTION DU SENTIMENT ===' as evolution,
    EXTRACT(HOUR FROM created_at) as hour,
    EXTRACT(MINUTE FROM created_at) as minute,
    overall_sentiment,
    score,
    risk_level,
    CASE
        WHEN score > 10 THEN '🟢 HAUSSIER'
        WHEN score < -10 THEN '🔴 BAISSIER'
        ELSE '🟡 NEUTRE'
    END as trend_indicator
FROM sentiment_analyses
WHERE created_at >= CURRENT_DATE
ORDER BY created_at;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 6. DERNIÈRES NEWS PONDÉRÉES PAR IMPORTANCE
SELECT
    '=== NEWS LES PLUS RÉCENTES ===' as latest,
    source,
    title,
    url,
    CASE
        WHEN source = 'ZeroHedge' THEN '⚡ MARKET'
        WHEN source = 'CNBC' THEN '💰 TRADING'
        WHEN source = 'FinancialJuice' THEN '📈 FUTURES'
        WHEN source = 'FRED' THEN '📊 MACRO'
        WHEN source = 'Finnhub' THEN '🏢 EARNINGS/NEWS'
        WHEN source = 'CME_VIX' THEN '📉 VOLATILITY'
        ELSE '📰 GENERAL'
    END as source_type,
    created_at
FROM news_items
ORDER BY created_at DESC
LIMIT 15;
```

## 📋 Utilisation dans pgAdmin 4

1. **Ouvrir pgAdmin 4**
2. **Se connecter** au serveur PostgreSQL avec les identifiants :

   - Host: `localhost`
   - Port: `5432`
   - Database: `financial_analyst`
   - Username: `postgres`
   - Password: `9022`

3. **Accéder au Query Tool** :

   - Clic droit sur la base `financial_analyst`
   - Sélectionner **Query Tool**

4. **Exécuter la requête** :
   - Copier-coller la requête ci-dessus
   - Appuyer sur **F5** ou cliquer sur l'icône ⚡ **Execute**

## 🎯 Ce que la requête montre

- ✅ **Statistiques des tables** : Nombre d'enregistrements par table
- ✅ **Analyses de sentiment récentes** : Scores, tendances, catalysts
- ✅ **News récentes** : Articles par source avec horodatage
- ✅ **Répartition des sources** : Pourcentage par source de news
- ✅ **Évolution chronologique** : Progression du sentiment dans le temps
- ✅ **News importantes** : Articles récents catégorisés par importance

## 🔧 Requêtes rapides utiles

### Voir les 5 dernières analyses

```sql
SELECT overall_sentiment, score, risk_level, created_at
FROM sentiment_analyses
ORDER BY created_at DESC
LIMIT 5;
```

### Compter les articles par source

```sql
SELECT source, COUNT(*) as count
FROM news_items
GROUP BY source
ORDER BY count DESC;
```

### Voir les données macro-économiques (FRED)

```sql
SELECT title, created_at
FROM news_items
WHERE source = 'FRED'
ORDER BY created_at DESC
LIMIT 10;
```

### Voir les news Finnhub

```sql
SELECT title, created_at
FROM news_items
WHERE source = 'Finnhub'
ORDER BY created_at DESC
LIMIT 10;
```

### Voir la Volatilité (VIX) et FedWatch

```sql
SELECT title, created_at
FROM news_items
WHERE source IN ('CME_VIX', 'CME_FEDWATCH')
ORDER BY created_at DESC
LIMIT 10;
```

### Voir les dernières news (Toutes sources)

```sql
SELECT title, source, created_at
FROM news_items
ORDER BY created_at DESC
LIMIT 10;
```

---

_Document généré pour le projet Financial Analyst_
