import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function addMissingColumns() {
    console.log("🔧 Adding missing columns to sentiment_analyses table...");

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'financial_analyst'
    });

    try {
        const client = await pool.connect();

        try {
            // Add all missing columns
            const alterQueries = [
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS analysis_time TIME NOT NULL DEFAULT CURRENT_TIME',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS market_session VARCHAR(20) CHECK (market_session IN (\'pre-market\', \'regular\', \'after-hours\', \'weekend\'))',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS inference_duration_ms INTEGER',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS kilocode_tokens_used INTEGER DEFAULT 0',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS kilocode_model_version VARCHAR(50)',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS volatility_estimate DECIMAL(5,2)',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS market_regime VARCHAR(20) CHECK (market_regime IN (\'bull\', \'bear\', \'sideways\', \'transitional\'))',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS sentiment_strength VARCHAR(15) CHECK (sentiment_strength IN (\'weak\', \'moderate\', \'strong\', \'extreme\'))',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS key_insights JSONB DEFAULT \'[]\'',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS trading_signals JSONB DEFAULT \'{}\'',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS technical_bias VARCHAR(20) CHECK (technical_bias IN (\'oversold\', \'neutral\', \'overbought\'))',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS news_impact_level VARCHAR(15) CHECK (news_impact_level IN (\'low\', \'medium\', \'high\', \'critical\'))',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS algorithm_confidence DECIMAL(3,2)',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS validation_flags JSONB DEFAULT \'{}\'',
                'ALTER TABLE sentiment_analyses ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT \'{}\''
            ];

            for (const query of alterQueries) {
                console.log(`⚡ Executing: ${query.substring(0, 50)}...`);
                await client.query(query);
            }

            console.log("✅ All columns added successfully!");

        } finally {
            client.release();
        }

    } catch (error) {
        console.error("❌ Error adding columns:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    addMissingColumns().catch(console.error);
}

export { addMissingColumns };