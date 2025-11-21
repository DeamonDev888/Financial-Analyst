-- Financial Analyst Database Schema
-- Schema pour le cache des news et analyse de sentiment

-- Extension pour UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table pour stocker les nouvelles brutes
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(1000) NOT NULL,
    url VARCHAR(2048) UNIQUE NOT NULL,
    source VARCHAR(100) NOT NULL,
    content TEXT,
    author VARCHAR(200),
    published_at TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sentiment VARCHAR(20) CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    keywords JSONB DEFAULT '[]',
    market_hours VARCHAR(20) CHECK (market_hours IN ('pre-market', 'market', 'after-hours', 'extended')),
    processing_status VARCHAR(20) DEFAULT 'raw' CHECK (processing_status IN ('raw', 'processed', 'analyzed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour stocker les analyses de sentiment
CREATE TABLE IF NOT EXISTS sentiment_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_date DATE NOT NULL,
    overall_sentiment VARCHAR(20) CHECK (overall_sentiment IN ('bullish', 'bearish', 'neutral')),
    score INTEGER CHECK (score >= -100 AND score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    catalysts JSONB DEFAULT '[]',
    summary TEXT,
    news_count INTEGER DEFAULT 0,
    sources_analyzed JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour tracking les sources et leur disponibilité
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(500),
    rss_url VARCHAR(500),
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    scrape_interval_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les sessions de scraping
CREATE TABLE IF NOT EXISTS scraping_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    news_scraped INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    sources_used JSONB DEFAULT '[]',
    duration_seconds INTEGER
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_source ON news_items(source);
CREATE INDEX IF NOT EXISTS idx_news_items_sentiment ON news_items(sentiment);
CREATE INDEX IF NOT EXISTS idx_news_items_market_hours ON news_items(market_hours);
CREATE INDEX IF NOT EXISTS idx_news_items_keywords ON news_items USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_news_items_processing_status ON news_items(processing_status);
CREATE INDEX IF NOT EXISTS idx_news_items_scraped_at ON news_items(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_sentiment_analyses_analysis_date ON sentiment_analyses(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_analyses_overall_sentiment ON sentiment_analyses(overall_sentiment);

CREATE INDEX IF NOT EXISTS idx_news_sources_last_scraped ON news_sources(last_scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sources_is_active ON news_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_scraping_sessions_started_at ON scraping_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_status ON scraping_sessions(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_news_items_updated_at BEFORE UPDATE ON news_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_sources_updated_at BEFORE UPDATE ON news_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertion des sources par défaut
INSERT INTO news_sources (name, rss_url, scrape_interval_minutes) VALUES
('ZeroHedge', 'http://feeds.feedburner.com/zerohedge/feed', 60),
('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', 60),
('FinancialJuice', NULL, 120)
ON CONFLICT (name) DO NOTHING;

-- Vues pour les requêtes communes
CREATE OR REPLACE VIEW latest_news AS
SELECT
    id,
    title,
    source,
    url,
    published_at,
    sentiment,
    confidence,
    keywords,
    market_hours
FROM news_items
WHERE published_at >= NOW() - INTERVAL '7 days'
ORDER BY published_at DESC;

CREATE OR REPLACE VIEW daily_news_summary AS
SELECT
    DATE(published_at) as analysis_date,
    source,
    COUNT(*) as news_count,
    COUNT(CASE WHEN sentiment = 'bullish' THEN 1 END) as bullish_count,
    COUNT(CASE WHEN sentiment = 'bearish' THEN 1 END) as bearish_count,
    COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_count,
    COUNT(CASE WHEN market_hours = 'market' THEN 1 END) as market_hours_count
FROM news_items
WHERE published_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(published_at), source
ORDER BY analysis_date DESC, source;

CREATE OR REPLACE VIEW source_performance AS
SELECT
    ns.name,
    ns.last_scraped_at,
    ns.last_success_at,
    ns.success_count,
    ns.error_count,
    CASE
        WHEN ns.success_count + ns.error_count = 0 THEN 0
        ELSE ROUND((ns.success_count::DECIMAL / (ns.success_count + ns.error_count)) * 100, 2)
    END as success_rate,
    CASE
        WHEN ns.last_success_at >= NOW() - INTERVAL '1 hour' THEN 'excellent'
        WHEN ns.last_success_at >= NOW() - INTERVAL '6 hours' THEN 'good'
        WHEN ns.last_success_at >= NOW() - INTERVAL '24 hours' THEN 'warning'
        ELSE 'critical'
    END as health_status
FROM news_sources ns
ORDER BY success_rate DESC;

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION get_news_for_analysis(
    p_hours_back INTEGER DEFAULT 24,
    p_sources TEXT[] DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    title VARCHAR(1000),
    source VARCHAR(100),
    url VARCHAR(2048),
    published_at TIMESTAMP WITH TIME ZONE,
    sentiment VARCHAR(20),
    keywords JSONB,
    market_hours VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.source,
        n.url,
        n.published_at,
        n.sentiment,
        n.keywords,
        n.market_hours
    FROM news_items n
    WHERE n.published_at >= NOW() - MAKE_INTERVAL(hours => p_hours_back)
      AND (p_sources IS NULL OR n.source = ANY(p_sources))
      AND n.processing_status = 'processed'
    ORDER BY n.published_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_news_cache(
    p_max_age_hours INTEGER DEFAULT 2
) RETURNS TABLE (
    source_name VARCHAR(100),
    status VARCHAR(20),
    news_count BIGINT,
    message TEXT
) AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Créer une nouvelle session de scraping
    v_session_id := uuid_generate_v4();
    INSERT INTO scraping_sessions (id, status) VALUES (v_session_id, 'running');

    -- Pour chaque source active, vérifier si besoin de rafraîchir
    RETURN QUERY
    WITH sources_to_refresh AS (
        SELECT ns.name, ns.id as source_id
        FROM news_sources ns
        WHERE ns.is_active = TRUE
          AND (
            ns.last_scraped_at IS NULL
            OR ns.last_scraped_at < NOW() - MAKE_INTERVAL(hours => p_max_age_hours)
          )
    )
    SELECT
        str.name as source_name,
        'pending'::VARCHAR(20) as status,
        0::BIGINT as news_count,
        'Scheduled for refresh'::TEXT as message
    FROM sources_to_refresh str;

    -- Mettre à jour la session
    UPDATE scraping_sessions
    SET completed_at = NOW(), status = 'completed'
    WHERE id = v_session_id;
END;
$$ LANGUAGE plpgsql;