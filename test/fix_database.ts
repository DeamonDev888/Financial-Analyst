import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function fixDatabase() {
    console.log("🔧 Fixing sentiment_analyses table...");

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'financial_analyst',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '9022',
    });

    const client = await pool.connect();
    try {
        console.log("🗑️ Dropping existing sentiment_analyses table...");
        await client.query('DROP TABLE IF EXISTS sentiment_analyses CASCADE');

        console.log("🏗️ Creating new sentiment_analyses table with correct constraints...");
        await client.query(`
            CREATE TABLE sentiment_analyses (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                analysis_date DATE NOT NULL,
                overall_sentiment VARCHAR(20) CHECK (overall_sentiment IN ('bullish', 'bearish', 'neutral')),
                score INTEGER CHECK (score >= -100 AND score <= 100),
                risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
                confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
                catalysts JSONB DEFAULT '[]',
                summary TEXT,
                news_count INTEGER DEFAULT 0,
                sources_analyzed JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        console.log("✅ Table fixed successfully!");

    } catch (error) {
        console.error("❌ Error fixing table:", error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixDatabase().catch(console.error);