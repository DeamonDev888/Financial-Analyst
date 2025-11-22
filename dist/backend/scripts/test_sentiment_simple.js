"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SentimentAgent_1 = require("../agents/SentimentAgent");
/**
 * Script de test simple pour le SentimentAgent
 * Résout les problèmes de timeout en utilisant une approche simplifiée
 */
async function main() {
    console.log("🚀 Testing SentimentAgent (Simple Mode)");
    console.log("=".repeat(50));
    const agent = new SentimentAgent_1.SentimentAgent();
    try {
        console.log("📊 Starting sentiment analysis...");
        // Utiliser un timeout plus long pour tester l'amélioration
        const analysisPromise = agent.analyzeMarketSentiment(false);
        // Ajouter un timeout manuel de 90 secondes (temps raisonnable pour l'analyse)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Analysis timeout after 90 seconds")), 90000);
        });
        const result = await Promise.race([analysisPromise, timeoutPromise]);
        console.log("\n✅ ANALYSIS COMPLETED!");
        console.log("=".repeat(50));
        console.log("📈 RESULT:");
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
    }
    catch (error) {
        console.error("\n❌ ANALYSIS FAILED:");
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Pas de fallback - afficher l'erreur sans données simulées
        console.log("\n❌ ANALYSIS FAILED - No fallback data provided");
        console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log("Result: N/A (as requested - no simulated data)");
    }
    finally {
        await agent.cleanup();
    }
}
// Gérer les erreurs non capturées
process.on('unhandledRejection', (error) => {
    console.error('\n💥 Unhandled Error:', error);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error);
    process.exit(1);
});
main();
