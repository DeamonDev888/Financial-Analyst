import { Pool, PoolClient, QueryResult } from 'pg';
import { NewsItem } from '../ingestion/NewsAggregator';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

export interface DatabaseNewsItem extends NewsItem {
    id?: string;
    content?: string;
    author?: string;
    scraped_at?: Date;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    confidence?: number;
    keywords?: string[];
    market_hours?: 'pre-market' | 'market' | 'after-hours' | 'extended';
    processing_status?: 'raw' | 'processed' | 'analyzed';
    created_at?: Date;
    updated_at?: Date;
}

export interface SentimentAnalysisRecord {
    id?: string;
    analysis_date: Date;
    overall_sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    confidence: number;
    catalysts: string[];
    summary: string;
    news_count: number;
    sources_analyzed: Record<string, number>;
    created_at?: Date;
}

export interface NewsSource {
    id?: string;
    name: string;
    base_url?: string;
    rss_url?: string;
    last_scraped_at?: Date;
    last_success_at?: Date;
    success_count: number;
    error_count: number;
    is_active: boolean;
    scrape_interval_minutes: number;
}

export class NewsDatabaseService {
    private pool: Pool;

    constructor(connectionString?: string) {
        // Vérifier si nous voulons utiliser la base de données
        const useDatabase = process.env.USE_DATABASE !== 'false';

        if (!useDatabase) {
            console.log("🔌 Database disabled - running in memory-only mode");
            this.pool = null as any;
            return;
        }

        try {
            // Utiliser les variables d'environnement ou une connexion par défaut
            const defaultConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'financial_analyst',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'password',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            };

            this.pool = new Pool(connectionString ? { connectionString } : defaultConfig);
            // L'initialisation sera faite lors de la première utilisation
        } catch (error) {
            console.log("⚠️ Database initialization failed - running in memory-only mode");
            this.pool = null as any;
        }
    }

    /**
     * Initialise la base de données avec le schéma
     */
    private async initializeDatabase(): Promise<void> {
        if (!this.pool) {
            console.log("🔌 Database disabled - skipping initialization");
            return;
        }

        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schemaSQL = await fs.readFile(schemaPath, 'utf-8');

            const client = await this.pool.connect();
            await client.query(schemaSQL);
            client.release();

            console.log("✅ Database initialized successfully");
        } catch (error) {
            console.log("⚠️ Database initialization failed - running without database");
            // Ne pas lancer d'erreur pour permettre à l'application de démarrer
        }
    }

    /**
     * Teste la connexion à la base de données
     */
    async testConnection(): Promise<boolean> {
        if (!this.pool) {
            console.log("🔌 Database disabled - running in memory-only mode");
            return false;
        }

        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            console.log("✅ Database connection successful");
            return true;
        } catch (error) {
            console.log("⚠️ Database connection failed - using memory-only mode");
            return false;
        }
    }

    /**
     * Récupère les news récentes depuis la base de données
     */
    async getRecentNews(hoursBack: number = 24, sources?: string[]): Promise<DatabaseNewsItem[]> {
        if (!this.pool) {
            // Mode mémoire - retourne un tableau vide
            return [];
        }

        const client = await this.pool.connect();
        try {
            let query = `
                SELECT id, title, url, source, content, author, published_at, scraped_at,
                       sentiment, confidence, keywords, market_hours, processing_status
                FROM news_items
                WHERE published_at >= NOW() - INTERVAL '${hoursBack} hours'
            `;
            const params: any[] = [];

            if (sources && sources.length > 0) {
                query += ` AND source = ANY($1)`;
                params.push(sources);
            }

            query += ` ORDER BY published_at DESC`;

            const result = await client.query(query, params.length > 0 ? params : undefined);

            return result.rows.map(this.mapRowToNewsItem);
        } finally {
            client.release();
        }
    }

    /**
     * Sauvegarde les news dans la base de données
     */
    async saveNewsItems(newsItems: NewsItem[]): Promise<number> {
        if (!this.pool) {
            // Mode mémoire - ne fait rien
            console.log(`💾 Memory-only mode: ${newsItems.length} news items processed but not saved`);
            return 0;
        }

        if (newsItems.length === 0) return 0;

        // S'assurer que les tables existent
        await this.initializeDatabase();

        const client = await this.pool.connect();
        let savedCount = 0;

        try {
            await client.query('BEGIN');

            for (const item of newsItems) {
                try {
                    // Vérifier si l'URL existe déjà
                    const existingResult = await client.query(
                        'SELECT id FROM news_items WHERE url = $1',
                        [item.url]
                    );

                    if (existingResult.rows.length === 0) {
                        // Insérer la nouvelle news
                        const insertQuery = `
                            INSERT INTO news_items (
                                title, url, source, published_at, scraped_at,
                                processing_status, keywords, market_hours
                            ) VALUES ($1, $2, $3, $4, $5, 'processed', $6, $7)
                            RETURNING id
                        `;

                        const keywords = this.extractKeywords(item.title);
                        const marketHours = this.determineMarketHours(item.timestamp);

                        await client.query(insertQuery, [
                            item.title,
                            item.url,
                            item.source,
                            item.timestamp,
                            new Date(),
                            JSON.stringify(keywords),
                            marketHours
                        ]);

                        savedCount++;
                    } else {
                        // Mettre à jour la news existante si nécessaire
                        await client.query(
                            `UPDATE news_items
                             SET scraped_at = $1, processing_status = 'processed'
                             WHERE url = $2`,
                            [new Date(), item.url]
                        );
                    }
                } catch (error) {
                    console.error(`Error saving news item: ${item.title}`, error);
                }
            }

            await client.query('COMMIT');
            console.log(`💾 Saved ${savedCount} new news items to database`);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error saving news items:", error);
            // Ne pas lancer d'erreur pour permettre à l'application de continuer
        } finally {
            client.release();
        }

        return savedCount;
    }

    /**
     * Récupère les news pour l'analyse de sentiment
     */
    async getNewsForAnalysis(hoursBack: number = 24): Promise<DatabaseNewsItem[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT id, title, url, source, published_at, scraped_at,
                       sentiment, confidence, keywords, market_hours, processing_status
                FROM news_items
                WHERE published_at >= NOW() - INTERVAL '${hoursBack} hours'
                  AND processing_status = 'processed'
                ORDER BY published_at DESC
                LIMIT 100
            `);

            return result.rows.map(this.mapRowToNewsItem);
        } finally {
            client.release();
        }
    }

    /**
     * Sauvegarde une analyse de sentiment
     */
    async saveSentimentAnalysis(analysis: any): Promise<string> {
        if (!this.pool) {
            console.log("🔌 Database disabled - skipping sentiment analysis save");
            return '';
        }

        try {
            // S'assurer que les tables existent
            await this.initializeDatabase();

            const client = await this.pool.connect();
            const result = await client.query(`
                INSERT INTO sentiment_analyses (
                    analysis_date, overall_sentiment, score, risk_level, confidence,
                    catalysts, summary, news_count, sources_analyzed
                ) VALUES (
                    CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8
                ) RETURNING id
            `, [
                analysis.sentiment?.toUpperCase(),
                analysis.score || 0,
                analysis.risk_level?.toUpperCase(),
                0.8, // confidence par défaut
                JSON.stringify(analysis.catalysts || []),
                analysis.summary || '',
                0, // sera mis à jour après
                JSON.stringify({})
            ]);

            client.release();
            return result.rows[0].id;
        } catch (error) {
            console.log("⚠️ Failed to save sentiment analysis - continuing without database");
            return '';
        }
    }

    /**
     * Récupère la dernière analyse de sentiment
     */
    async getLatestSentimentAnalysis(): Promise<SentimentAnalysisRecord | null> {
        if (!this.pool) return null;
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM sentiment_analyses
                ORDER BY created_at DESC
                LIMIT 1
            `);

            return result.rows.length > 0 ? result.rows[0] : null;
        } finally {
            client.release();
        }
    }

    /**
     * Vérifie si le cache de news est à jour
     */
    async isCacheFresh(maxAgeHours: number = 2): Promise<boolean> {
        if (!this.pool) {
            // Mode mémoire - toujours considéré comme non frais
            return false;
        }

        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT COUNT(*) as count
                FROM news_items
                WHERE scraped_at >= NOW() - INTERVAL '${maxAgeHours} hours'
            `);

            return parseInt(result.rows[0].count) > 0;
        } catch (error) {
            console.log("⚠️ Cache freshness check failed - using memory-only mode");
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Met à jour le statut d'une source
     */
    async updateSourceStatus(
        sourceName: string,
        success: boolean,
        error?: string
    ): Promise<void> {
        if (!this.pool) {
            console.log("🔌 Database disabled - skipping source status update");
            return;
        }

        try {
            const client = await this.pool.connect();
            try {
                if (success) {
                    await client.query(`
                        UPDATE news_sources
                        SET last_success_at = NOW(),
                            last_scraped_at = NOW(),
                            success_count = success_count + 1
                        WHERE name = $1
                    `, [sourceName]);
                } else {
                    await client.query(`
                        UPDATE news_sources
                        SET last_scraped_at = NOW(),
                            error_count = error_count + 1
                        WHERE name = $1
                    `, [sourceName]);
                }
            } finally {
                client.release();
            }
        } catch (error) {
            console.log("⚠️ Failed to update source status - continuing without database");
        }
    }

    /**
     * Récupère les statistiques de la base de données
     */
    async getDatabaseStats(): Promise<any> {
        if (!this.pool) return { error: 'Database disabled' };
        const client = await this.pool.connect();
        try {
            const [newsStats, sourceStats, analysisStats] = await Promise.all([
                client.query(`
                    SELECT
                        COUNT(*) as total_news,
                        COUNT(CASE WHEN published_at >= CURRENT_DATE THEN 1 END) as today_news,
                        COUNT(CASE WHEN sentiment = 'bullish' THEN 1 END) as bullish,
                        COUNT(CASE WHEN sentiment = 'bearish' THEN 1 END) as bearish,
                        COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral,
                        MAX(published_at) as latest_news
                    FROM news_items
                `),
                client.query(`
                    SELECT name, last_scraped_at, success_count, error_count, is_active
                    FROM news_sources
                    ORDER BY last_scraped_at DESC
                `),
                client.query(`
                    SELECT COUNT(*) as total_analyses,
                            MAX(created_at) as latest_analysis
                    FROM sentiment_analyses
                `)
            ]);

            return {
                news: newsStats.rows[0],
                sources: sourceStats.rows,
                analyses: analysisStats.rows[0]
            };
        } finally {
            client.release();
        }
    }

    /**
     * Nettoie les anciennes données
     */
    async cleanupOldData(daysToKeep: number = 30): Promise<void> {
        if (!this.pool) return;
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                DELETE FROM news_items
                WHERE published_at < NOW() - INTERVAL '${daysToKeep} days'
            `);

            console.log(`🧹 Cleaned up ${result.rowCount} old news items`);
        } finally {
            client.release();
        }
    }

    /**
     * Mappe un résultat de base de données vers un NewsItem
     */
    private mapRowToNewsItem(row: any): DatabaseNewsItem {
        return {
            id: row.id,
            title: row.title,
            url: row.url,
            source: row.source,
            content: row.content,
            author: row.author,
            timestamp: row.published_at,
            scraped_at: row.scraped_at,
            sentiment: row.sentiment,
            confidence: row.confidence,
            keywords: Array.isArray(row.keywords) ? row.keywords : JSON.parse(row.keywords || '[]'),
            market_hours: row.market_hours,
            processing_status: row.processing_status,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    /**
     * Extrait les mots-clés d'un titre (version simplifiée)
     */
    private extractKeywords(title: string): string[] {
        const marketKeywords = [
            'fed', 'rate', 'inflation', 'cpi', 'market', 'stock', 'trade',
            'bull', 'bear', 'rally', 'crash', 'volatile', 'economy'
        ];

        const titleLower = title.toLowerCase();
        return marketKeywords.filter(keyword => titleLower.includes(keyword));
    }

    /**
     * Détermine les heures de marché
     */
    private determineMarketHours(timestamp: Date): 'pre-market' | 'market' | 'after-hours' | 'extended' {
        const estTime = new Date(timestamp.toLocaleString("en-US", { timeZone: "America/New_York" }));
        const hours = estTime.getHours();
        const day = estTime.getDay();

        if (day === 0 || day === 6) return 'extended';
        if (hours >= 4 && hours < 9) return 'pre-market';
        if (hours >= 9 && hours < 16) return 'market';
        if (hours >= 16 && hours < 20) return 'after-hours';
        return 'extended';
    }

    /**
     * Ferme proprement la connexion à la base de données
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            console.log("🔌 Database connection closed");
        } else {
            console.log("🔌 Memory-only mode - no connection to close");
        }
    }
}