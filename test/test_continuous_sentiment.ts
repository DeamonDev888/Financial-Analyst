import { SentimentAgentFinal } from '../src/backend/agents/SentimentAgentFinal';

/**
 * Continuous Sentiment Analysis - runs indefinitely
 */

async function main() {
    console.log("🚀 Starting CONTINUOUS Sentiment Analysis");
    console.log("=".repeat(60));
    console.log("Press Ctrl+C to stop at any time");
    console.log("=".repeat(60));

    const agent = new SentimentAgentFinal();
    let analysisCount = 0;

    while (true) {
        try {
            analysisCount++;
            console.log(`\n🔄 Analysis #${analysisCount} - ${new Date().toLocaleString()}`);
            console.log("-".repeat(40));

            console.log("📊 Starting sentiment analysis...");

            const analysisPromise = agent.analyzeMarketSentiment(false);

            // Timeout de 60 secondes pour chaque analyse
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Analysis timeout after 60 seconds")), 60000);
            });

            const result = await Promise.race([analysisPromise, timeoutPromise]);

            console.log("\n✅ ANALYSIS COMPLETED!");
            console.log("=".repeat(40));
            console.log(`📈 Result: ${result.sentiment} ${result.score ? `(${result.score}/100)` : ''}`);

            if (result.summary) {
                console.log(`📝 Summary: ${result.summary}`);
            }

            if (result.data_source) {
                console.log(`📊 Data Source: ${result.data_source} | Method: ${result.analysis_method}`);
            }

            console.log(`\n⏰ Waiting 5 minutes before next analysis...`);
            console.log("   (Press Ctrl+C to stop)");

            // Attendre 5 minutes avant la prochaine analyse
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

        } catch (error) {
            console.error("\n❌ ANALYSIS FAILED:");
            console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.log("⏰ Retrying in 1 minute...");

            // Attendre 1 minute avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        }
    }
}

// Gérer l'interruption avec Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n🛑 Continuous analysis stopped by user');
    process.exit(0);
});

main().catch(console.error);