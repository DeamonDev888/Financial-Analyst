import { SentimentAgentFinal } from './src/backend/agents/SentimentAgentFinal';
import { NewsDatabaseService } from './src/backend/database/NewsDatabaseService';
import { NewsAggregator } from './src/backend/ingestion/NewsAggregator';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Financial Analyst Application - Main Entry Point
 *
 * Features:
 * - Database-driven sentiment analysis
 * - KiloCode AI integration
 * - Robust error handling (N/A when analysis fails)
 * - No fallback to simulated data
 * - Real-time market sentiment monitoring
 */

class FinancialAnalystApp {
    private sentimentAgent: SentimentAgentFinal;
    private dbService: NewsDatabaseService;
    private newsAggregator: NewsAggregator;

    constructor() {
        this.sentimentAgent = new SentimentAgentFinal();
        this.dbService = new NewsDatabaseService();
        this.newsAggregator = new NewsAggregator();
    }

    /**
     * Initialize database and verify connections
     */
    async initialize(): Promise<boolean> {
        console.log("🚀 Initializing Financial Analyst Application...");
        console.log("=".repeat(60));

        try {
            // Test database connection
            const dbConnected = await this.dbService.testConnection();
            if (!dbConnected) {
                console.log("❌ Database connection failed");
                return false;
            }

            console.log("✅ Database connection successful");
            return true;

        } catch (error) {
            console.error("❌ Initialization failed:", error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Get latest news from database
     */
    async getNewsStatus(): Promise<void> {
        const news = await this.dbService.getRecentNews(48); // Last 48 hours
        const cacheFresh = await this.dbService.isCacheFresh(2); // 2 hours

        console.log(`📊 Database Status:`);
        console.log(`   ├─ News items: ${news.length}`);
        console.log(`   ├─ Cache: ${cacheFresh ? 'FRESH' : 'STALE'}`);
        console.log(`   └─ Time range: Last 48 hours`);

        if (news.length > 0) {
            const sources = [...new Set(news.map(n => n.source))];
            console.log(`\n📰 Sources: ${sources.join(', ')}`);
        }
    }

    /**
     * Run sentiment analysis
     */
    async analyzeMarketSentiment(): Promise<void> {
        console.log("\n🔍 Starting Market Sentiment Analysis...");
        console.log("=".repeat(60));

        try {
            const result = await this.sentimentAgent.analyzeMarketSentiment(false);

            console.log("\n✅ ANALYSIS COMPLETED SUCCESSFULLY!");
            console.log("=".repeat(60));
            console.log("📈 MARKET SENTIMENT RESULT:");
            console.log(JSON.stringify(result, null, 2));

            console.log("\n🎯 KEY INSIGHTS:");
            if (result.sentiment) {
                console.log(`   Sentiment: ${result.sentiment} ${result.score ? `(${result.score}/100)` : ''}`);
            }
            if (result.risk_level) {
                console.log(`   Risk Level: ${result.risk_level}`);
            }
            if (result.catalysts && result.catalysts.length > 0) {
                console.log(`   Catalysts: ${result.catalysts.slice(0, 5).join(', ')}`);
            }
            if (result.summary) {
                console.log(`   Summary: ${result.summary}`);
            }
            console.log(`   News Count: ${result.news_count || 0} items`);
            console.log(`   Data Source: ${result.data_source || 'unknown'}`);
            console.log(`   Analysis Method: ${result.analysis_method || 'unknown'}`);

        } catch (error) {
            console.error("\n❌ ANALYSIS FAILED:");
            console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Run continuous monitoring
     */
    async runContinuousMode(): Promise<void> {
        console.log("\n🔄 Starting CONTINUOUS Monitoring Mode...");
        console.log("Press Ctrl+C to stop at any time");
        console.log("=".repeat(60));

        let analysisCount = 0;

        while (true) {
            try {
                analysisCount++;
                console.log(`\n🔄 Analysis #${analysisCount} - ${new Date().toLocaleString()}`);
                console.log("-".repeat(40));

                await this.analyzeMarketSentiment();

                console.log(`\n⏰ Waiting 5 minutes before next analysis...`);
                console.log("   (Press Ctrl+C to stop)");

                // Wait 5 minutes
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

            } catch (error) {
                console.error(`\n❌ Analysis #${analysisCount} failed:`, error instanceof Error ? error.message : 'Unknown error');
                console.log("⏰ Retrying in 1 minute...");

                // Wait 1 minute before retry
                await new Promise(resolve => setTimeout(resolve, 60 * 1000));
            }
        }
    }

    /**
     * Display usage help
     */
    displayHelp(): void {
        console.log(`
📊 Financial Analyst Application - Usage

Modes:
  --analyze          Run single sentiment analysis
  --continuous       Run continuous monitoring (5-min intervals)
  --status          Show database status only
  --help           Show this help message

Examples:
  npm run analyze              # Single analysis
  npm run continuous           # Continuous monitoring
  npm run status               # Database status
  npx ts-node run.ts --analyze # Direct execution

Features:
  ✅ Database-driven sentiment analysis
  ✅ KiloCode AI integration
  ✅ No simulated data fallbacks
  ✅ Robust error handling (N/A when fails)
  ✅ Real-time ES Futures sentiment
  ✅ 22+ news sources analyzed
        `);
    }
}

/**
 * Main execution
 */
async function main() {
    const app = new FinancialAnalystApp();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const mode = args[0] || '--help';

    try {
        switch (mode) {
            case '--analyze':
            case '-a':
                const initialized = await app.initialize();
                if (initialized) {
                    await app.getNewsStatus();
                    await app.analyzeMarketSentiment();
                }
                break;

            case '--continuous':
            case '-c':
                const contInitialized = await app.initialize();
                if (contInitialized) {
                    await app.getNewsStatus();
                    await app.runContinuousMode();
                }
                break;

            case '--status':
            case '-s':
                const statusInitialized = await app.initialize();
                if (statusInitialized) {
                    await app.getNewsStatus();
                }
                break;

            case '--help':
            case '-h':
            default:
                app.displayHelp();
                break;
        }

    } catch (error) {
        console.error("❌ Application error:", error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Financial Analyst Application stopped by user');
    process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the application
if (require.main === module) {
    main().catch(console.error);
}

export { FinancialAnalystApp };