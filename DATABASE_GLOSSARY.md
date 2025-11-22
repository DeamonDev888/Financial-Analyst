# 📚 Glossaire de la Base de Données Financial Analyst

Ce document détaille la structure de la base de données PostgreSQL utilisée par le système. Il sert de référence pour le développement d'algorithmes et l'analyse de données.

> **Généré automatiquement** par `generate_db_glossary.ts` le 2025-11-22 13 h 32 min 40 s

## 🗂️ Tables Principales

### `news_items`
Stocke les articles de news bruts et traités récupérés depuis les sources (ZeroHedge, CNBC, FinancialJuice) ainsi que les indicateurs macro-économiques (FRED). C'est la source de vérité pour les données d'entrée.

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **title** | `VARCHAR(1000)` | **Required** |
| **url** | `VARCHAR(2048)` | Unique **Required** |
| **source** | `VARCHAR(100)` | **Required** |
| **content** | `TEXT` |  |
| **author** | `VARCHAR(200)` |  |
| **published_at** | `TIMESTAMP` | WITH TIME ZONE |
| **scraped_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |
| **sentiment** | `VARCHAR(20)` | Valid: `sentiment IN ('bullish', 'bearish', 'neutral'`) |
| **confidence** | `DECIMAL(3,2)` | Valid: `confidence >= 0 AND confidence <= 1` |
| **keywords** | `JSONB` | Def: ``'[]' |
| **market_hours** | `VARCHAR(20)` | Valid: `market_hours IN ('pre-market', 'market', 'after-hours', 'extended'`) |
| **processing_status** | `VARCHAR(20)` | Def: ``'raw' Valid: `processing_status IN ('raw', 'processed', 'analyzed'`) |
| **created_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |
| **updated_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |

---

### `sentiment_analyses`
Contient l'historique des analyses générées par l'IA. Chaque ligne correspond à une exécution de l'agent de sentiment.

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **analysis_date** | `DATE` | **Required** |
| **analysis_time** | `TIME` | **Required** |
| **overall_sentiment** | `VARCHAR(20)` | Valid: `overall_sentiment IN ('bullish', 'bearish', 'neutral'`) |
| **score** | `INTEGER` | Valid: `score >= -100 AND score <= 100` |
| **risk_level** | `VARCHAR(20)` | Valid: `risk_level IN ('low', 'medium', 'high'`) |
| **confidence** | `DECIMAL(3,2)` | Valid: `confidence >= 0 AND confidence <= 1` |
| **catalysts** | `JSONB` | Def: ``'[]' |
| **summary** | `TEXT` |  |
| **news_count** | `INTEGER` | Def: ``0 |
| **sources_analyzed** | `JSONB` | Def: ``'{}' |
| **kilocode_model_version** | `VARCHAR(50)` |  |
| **sentiment_strength** | `VARCHAR(15)` | Valid: `sentiment_strength IN ('weak', 'moderate', 'strong', 'extreme'`) |
| **news_impact_level** | `VARCHAR(15)` | Valid: `news_impact_level IN ('low', 'medium', 'high', 'critical'`) |

---

### `news_sources`
Registre des sources de données, leur configuration (URL RSS) et leur état de santé (succès/échec du scraping).

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **name** | `VARCHAR(100)` | Unique **Required** |
| **base_url** | `VARCHAR(500)` |  |
| **rss_url** | `VARCHAR(500)` |  |
| **last_scraped_at** | `TIMESTAMP` | WITH TIME ZONE |
| **last_success_at** | `TIMESTAMP` | WITH TIME ZONE |
| **success_count** | `INTEGER` | Def: ``0 |
| **error_count** | `INTEGER` | Def: ``0 |
| **is_active** | `BOOLEAN` | Def: ``TRUE |
| **scrape_interval_minutes** | `INTEGER` | Def: ``60 |
| **created_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |
| **updated_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |

---

### `scraping_sessions`
Logs des sessions de scraping pour le monitoring et le débogage.

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **started_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |
| **completed_at** | `TIMESTAMP` | WITH TIME ZONE |
| **status** | `VARCHAR(20)` | Def: ``'running' Valid: `status IN ('running', 'completed', 'failed'`) |
| **news_scraped** | `INTEGER` | Def: ``0 |
| **errors** | `JSONB` | Def: ``'[]' |
| **sources_used** | `JSONB` | Def: ``'[]' |
| **duration_seconds** | `INTEGER` |  |

---

### `market_time_series`
Données temporelles structurées pour les algorithmes quantitatifs (séries chronologiques de sentiment, volatilité, etc.).

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **timestamp** | `TIMESTAMP` | WITH TIME ZONE **Required** |
| **sentiment_score** | `INTEGER` | Valid: `sentiment_score >= -100 AND sentiment <= 100` |
| **volatility_estimate** | `DECIMAL(5,2)` |  |
| **news_impact_score** | `DECIMAL(5,2)` |  |
| **market_session** | `VARCHAR(20)` | Valid: `market_session IN ('pre-market', 'regular', 'after-hours', 'weekend'`) |
| **trading_volume_trend** | `VARCHAR(10)` | Valid: `trading_volume_trend IN ('low', 'normal', 'high', 'extreme'`) |
| **key_events** | `JSONB` | Def: ``'[]' |
| **technical_indicators** | `JSONB` | Def: ``'{}' |
| **correlation_metrics** | `JSONB` | Def: ``'{}' |
| **created_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |

---

### `market_patterns`
Patterns de marché détectés par les algorithmes (ex: divergence sentiment/prix, pics de volatilité).

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **pattern_name** | `VARCHAR(100)` | **Required** |
| **pattern_type** | `VARCHAR(50)` | Valid: `pattern_type IN ('sentiment', 'volatility', 'correlation', 'momentum', 'reversal'`) |
| **detection_date** | `TIMESTAMP` | WITH TIME ZONE **Required** |
| **confidence_score** | `DECIMAL(3,2)` | Valid: `confidence_score >= 0 AND confidence_score <= 1` |
| **duration_minutes** | `INTEGER` |  |
| **strength** | `VARCHAR(15)` | Valid: `strength IN ('weak', 'moderate', 'strong', 'extreme'`) |
| **description** | `TEXT` |  |
| **implications** | `JSONB` | Def: ``'{}' |
| **historical_accuracy** | `DECIMAL(3,2)` |  |
| **related_analyses** | `UUID` | [] Def: ``'{}' |
| **metadata** | `JSONB` | Def: ``'{}' |
| **is_active** | `BOOLEAN` | Def: ``TRUE |
| **created_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |

---

### `algorithm_performance`
Métriques de performance des différents algorithmes et versions pour le backtesting et l'optimisation.

| Colonne | Type | Description / Contraintes |
| :--- | :--- | :--- |
| **id** | `UUID` | 🔑 **PK** Def: ``uuid_generate_v4() |
| **algorithm_name** | `VARCHAR(100)` | **Required** |
| **version** | `VARCHAR(20)` |  |
| **test_date** | `DATE` | **Required** |
| **accuracy_score** | `DECIMAL(5,4)` |  |
| **precision_score** | `DECIMAL(5,4)` |  |
| **recall_score** | `DECIMAL(5,4)` |  |
| **f1_score** | `DECIMAL(5,4)` |  |
| **false_positive_rate** | `DECIMAL(5,4)` |  |
| **false_negative_rate** | `DECIMAL(5,4)` |  |
| **prediction_confidence_avg** | `DECIMAL(3,2)` |  |
| **predictions_count** | `INTEGER` | Def: ``0 |
| **correct_predictions** | `INTEGER` | Def: ``0 |
| **metrics** | `JSONB` | Def: ``'{}' |
| **performance_grade** | `VARCHAR(2)` | Valid: `performance_grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'`) |
| **notes** | `TEXT` |  |
| **created_at** | `TIMESTAMP` | WITH TIME ZONE Def: ``NOW() |

---

## 👁️ Vues (Views)

Les vues simplifient l'accès aux données pour les agents et les dashboards.

### `latest_news`
Vue simplifiée des news des 7 derniers jours.

### `daily_news_summary`
Agrégation quotidienne des news par source et sentiment.

### `source_performance`
Métriques de fiabilité des sources (taux de succès, dernière mise à jour).

### `news_for_analysis`
Vue filtrée pour l'agent : news des 48h dernières heures prêtes pour l'analyse.

### `recent_sentiment_analyses`
Vue des 30 derniers jours d'analyses avec les métriques clés.

### `active_market_patterns`
Patterns actuellement actifs et pertinents.

### `recent_time_series`
Données haute fréquence des 24 dernières heures.

