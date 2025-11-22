import { SentimentAgentSimple } from './src/backend/agents/SentimentAgentSimple';

/**
 * Test du SentimentAgentSimple robuste
 */

async function main() {
    console.log("🚀 Testing ROBUST SentimentAgentSimple");
    console.log("=".repeat(60));

    const agent = new SentimentAgentSimple();

    try {
        console.log("📊 Starting sentiment analysis with ROBUST agent...");

        const analysisPromise = agent.analyzeMarketSentiment(false);

        // Timeout de 60 secondes pour le test
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Analysis timeout after 60 seconds")), 60000);
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);

        console.log("\n✅ ANALYSIS COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log("📈 ROBUST RESULT:");
        console.log(JSON.stringify(result, null, 2));
        console.log("\n🎯 KEY INSIGHTS:");

        if (result.sentiment) {
            console.log(`   Sentiment: ${result.sentiment} ${result.score ? `(${result.score}/100)` : ''}`);
        }
        if (result.risk_level) {
            console.log(`   Risk Level: ${result.risk_level}`);
        }
        if (result.catalysts && result.catalysts.length > 0) {
            console.log(`   Catalysts: ${result.catalysts.slice(0, 3).join(', ')}`);
        }
        if (result.summary) {
            console.log(`   Summary: ${result.summary}`);
        }

    } catch (error) {
        console.error("\n❌ ANALYSIS FAILED:");
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        // Le SentimentAgentSimple n'a pas de cleanup pour le moment
        console.log("📊 Analysis completed");
    }
}

main().catch(console.error);