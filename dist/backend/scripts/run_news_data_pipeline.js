"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NewsDataManager_1 = require("../data/NewsDataManager");
/**
 * SCRIPT: run_news_data_pipeline.ts
 *
 * Script principal pour le traitement et l'organisation des données de marché.
 *
 * Fonctionnalités:
 * 1. Scraping des 3 sources (ZeroHedge, CNBC, FinancialJuice)
 * 2. Nettoyage et classification des nouvelles
 * 3. Organisation par jour et heure
 * 4. Analyse de sentiment et extraction de mots-clés
 * 5. Génération de rapports et exports CSV
 */
async function main() {
    console.log("🚀 Starting News Data Processing Pipeline...");
    console.log("=".repeat(60));
    const dataManager = new NewsDataManager_1.NewsDataManager();
    try {
        // Exécuter le pipeline quotidien
        await dataManager.runDailyNewsPipeline();
        console.log("\n📊 Available Commands for Data Analysis:");
        console.log("-".repeat(40));
        console.log("📈 Generate weekly report:");
        console.log("   npm run analyze:week");
        console.log("\n📈 Generate monthly report:");
        console.log("   npm run analyze:month");
        console.log("\n📄 Export to CSV:");
        console.log("   npm run export:csv");
        console.log("\n🔍 View available dates:");
        console.log("   npm run data:dates");
        console.log("\n📋 View today's summary:");
        console.log("   npm run data:today");
    }
    catch (error) {
        console.error("❌ Pipeline failed:", error);
        process.exit(1);
    }
}
main();
