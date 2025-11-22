import { NewsDatabaseService } from '../src/backend/database/NewsDatabaseService';

/**
 * Test de connexion et configuration de la base de données
 */

async function main() {
    console.log("🔍 Testing Database Connection and Setup");
    console.log("=".repeat(50));

    const dbService = new NewsDatabaseService();

    try {
        console.log("1. Testing database connection...");
        const isConnected = await dbService.testConnection();

        if (isConnected) {
            console.log("✅ Database connection successful!");

            console.log("\n2. Database initialization happens automatically...");
            console.log("✅ Database should be ready!");

            console.log("\n3. Testing sample data operations...");

            // Test d'insertion de news
            const testNews = [{
                title: "Test news for database validation",
                url: "https://test.com",
                source: "TEST",
                timestamp: new Date()
            }];

            await dbService.saveNewsItems(testNews);
            console.log("✅ News items saved successfully!");

            // Test d'analyse de sentiment
            const testAnalysis = {
                analysis_date: new Date(),
                overall_sentiment: 'bullish' as const,
                score: 75,
                risk_level: 'LOW' as const,
                confidence: 0.85,
                catalysts: ['Test catalyst'],
                summary: 'Test analysis for database validation',
                news_count: 1,
                sources_analyzed: { TEST: 1 }
            };

            await dbService.saveSentimentAnalysis(testAnalysis);
            console.log("✅ Sentiment analysis saved successfully!");

            console.log("\n🎉 All database operations completed successfully!");

        } else {
            console.log("❌ Database connection failed");
        }

    } catch (error) {
        console.error("❌ Database test failed:", error);
        console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    } finally {
        await dbService.close();
        console.log("\n🔌 Database connection closed");
    }
}

main().catch(console.error);