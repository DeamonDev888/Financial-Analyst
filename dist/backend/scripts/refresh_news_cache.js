"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SentimentAgent_1 = require("../agents/SentimentAgent");
const NewsDatabaseService_1 = require("../database/NewsDatabaseService");
async function main() {
    const args = process.argv.slice(2);
    const options = {
        force: args.includes('--force') || args.includes('-f'),
        cleanup: args.includes('--cleanup') || args.includes('-c'),
        stats: args.includes('--stats') || args.includes('-s')
    };
    // Extraire le nombre d'heures si spécifié
    const hoursIndex = args.findIndex(arg => arg.startsWith('--hours=') || arg.startsWith('-h='));
    if (hoursIndex >= 0) {
        const hours = parseInt(args[hoursIndex].split('=')[1]);
        if (!isNaN(hours) && hours > 0) {
            options.hours = hours;
        }
    }
    console.log("🔄 News Cache Refresh Manager");
    console.log("=".repeat(40));
    console.log(`Options: Force=${options.force}, Cleanup=${options.cleanup}, Stats=${options.stats}, Hours=${options.hours || 'default'}`);
    console.log("");
    const agent = new SentimentAgent_1.SentimentAgent();
    const dbService = new NewsDatabaseService_1.NewsDatabaseService();
    try {
        // 1. Afficher les statistiques si demandé
        if (options.stats) {
            console.log("📊 Database Statistics:");
            const stats = await agent.getDatabaseStats();
            if (stats.error) {
                console.log(`❌ Error: ${stats.error}`);
            }
            else {
                console.log(`Total news: ${stats.news?.total_news || 0}`);
                console.log(`Today's news: ${stats.news?.today_news || 0}`);
                console.log(`Latest news: ${stats.news?.latest_news || 'N/A'}`);
                console.log(`Bullish: ${stats.news?.bullish || 0}, Bearish: ${stats.news?.bearish || 0}, Neutral: ${stats.news?.neutral || 0}`);
                console.log(`Total analyses: ${stats.analyses?.total_analyses || 0}`);
                console.log(`Latest analysis: ${stats.analyses?.latest_analysis || 'N/A'}`);
                if (stats.sources && stats.sources.length > 0) {
                    console.log("\n📰 Source Status:");
                    stats.sources.forEach((source) => {
                        const status = source.is_active ? '✅' : '❌';
                        const lastScraped = source.last_scraped_at ? new Date(source.last_scraped_at).toLocaleString() : 'Never';
                        console.log(`  ${status} ${source.name}: Success ${source.success_count}, Errors ${source.error_count}, Last: ${lastScraped}`);
                    });
                }
            }
            console.log("");
        }
        // 2. Vérifier l'état du cache
        const dbConnected = await dbService.testConnection();
        if (!dbConnected) {
            console.log("❌ Database not connected. Cannot use cache functionality.");
            console.log("💡 Please check your database configuration in .env");
            process.exit(1);
        }
        const isFresh = await dbService.isCacheFresh(options.hours || 2);
        console.log(`🕐 Cache Status: ${isFresh ? '✅ FRESH' : '⚠️ STALE'} (${options.hours || 2}h threshold)`);
        if (!isFresh || options.force) {
            console.log(`🔄 ${options.force ? 'Force refreshing' : 'Refreshing'} cache...`);
            // 3. Forcer le rafraîchissement
            const startTime = Date.now();
            await agent.refreshCache();
            const duration = (Date.now() - startTime) / 1000;
            console.log(`✅ Cache refreshed in ${duration.toFixed(2)}s`);
        }
        else {
            console.log("✅ Cache is fresh, no refresh needed");
        }
        // 4. Nettoyer les anciennes données si demandé
        if (options.cleanup) {
            console.log("🧹 Cleaning up old data...");
            await agent.cleanupOldData(30); // Garder 30 jours par défaut
            console.log("✅ Cleanup completed");
        }
        // 5. Afficher les statistiques finales
        console.log("\n📈 Final Statistics:");
        const finalStats = await agent.getDatabaseStats();
        if (!finalStats.error && finalStats.news) {
            console.log(`Total news in database: ${finalStats.news.total_news}`);
            console.log(`News from last 24h: ${finalStats.news.today_news}`);
        }
        console.log("\n✅ Cache refresh process completed successfully!");
    }
    catch (error) {
        console.error("❌ Cache refresh failed:", error);
        process.exit(1);
    }
    finally {
        await agent.cleanup();
    }
}
// Afficher l'aide si demandé
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log("News Cache Refresh Manager");
    console.log("==========================");
    console.log("");
    console.log("Usage: npm run refresh [options]");
    console.log("");
    console.log("Options:");
    console.log("  --force, -f        Force cache refresh regardless of freshness");
    console.log("  --cleanup, -c      Clean up old data (older than 30 days)");
    console.log("  --stats, -s        Show detailed database statistics");
    console.log("  --hours=N, -h=N    Set freshness threshold to N hours (default: 2)");
    console.log("  --help, -h         Show this help message");
    console.log("");
    console.log("Examples:");
    console.log("  npm run refresh --force           # Force refresh cache");
    console.log("  npm run refresh --stats            # Show stats only");
    console.log("  npm run refresh --cleanup          # Refresh and cleanup");
    console.log("  npm run refresh --hours=4          # Use 4-hour threshold");
    console.log("  npm run refresh -f -c -s           # Force refresh, cleanup, and show stats");
    process.exit(0);
}
main();
