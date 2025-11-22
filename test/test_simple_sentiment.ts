import { SentimentAgent } from './src/backend/agents/SentimentAgent';

/**
 * Test simplifié pour vérifier si le problème est lié à la taille du prompt
 */

async function main() {
    console.log("🚀 Testing SentimentAgent with minimal data");
    console.log("=".repeat(50));

    const agent = new SentimentAgent();

    try {
        console.log("📊 Starting sentiment analysis with minimal timeout...");

        // Timeout très court pour tester rapidement
        const analysisPromise = agent.analyzeMarketSentiment(false);

        // Timeout de 15 secondes seulement
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Quick timeout after 15 seconds")), 15000);
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);

        console.log("\n✅ ANALYSIS COMPLETED!");
        console.log("=".repeat(50));
        console.log("📈 RESULT:");
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("\n❌ ANALYSIS FAILED:");
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log("Result: N/A (testing improved parsing)");
    } finally {
        await agent.cleanup();
    }
}

main().catch(console.error);