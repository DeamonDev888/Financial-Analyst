import { SentimentAgentFinal } from '../src/backend/agents/SentimentAgentFinal';

/**
 * Test FINAL ROBUST SentimentAgentFinal
 */

async function main() {
    console.log("🚀 Testing FINAL ROBUST SentimentAgentFinal");
    console.log("=".repeat(60));

    const agent = new SentimentAgentFinal();

    try {
        console.log("📊 Starting ROBUST sentiment analysis...");

        const analysisPromise = agent.analyzeMarketSentiment(false);

        // Timeout de 60 secondes pour le test
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Analysis timeout after 60 seconds")), 60000);
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);

        console.log("\n✅ FINAL ANALYSIS COMPLETED SUCCESSFULLY!");
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
        if (result.data_source) {
            console.log(`   Data Source: ${result.data_source}`);
        }
        if (result.analysis_method) {
            console.log(`   Analysis Method: ${result.analysis_method}`);
        }

    } catch (error) {
        console.error("\n❌ FINAL ANALYSIS FAILED:");
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        console.log("📊 Final robust analysis completed");
    }
}

main().catch(console.error);