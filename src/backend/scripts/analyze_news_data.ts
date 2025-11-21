import { NewsDataManager, MarketAnalysisReport } from '../data/NewsDataManager';
import { NewsDataProcessor } from '../data/NewsDataProcessor';

/**
 * SCRIPT: analyze_news_data.ts
 *
 * Script pour l'analyse et l'exploration des données de marché traitées.
 *
 * Commandes disponibles:
 * - npm run analyze:week    -> Analyse des 7 derniers jours
 * - npm run analyze:month   -> Analyse des 30 derniers jours
 * - npm run data:dates      -> Voir les dates disponibles
 * - npm run data:today      -> Résumé du jour
 * - npm run export:csv      -> Exporter en CSV
 */

interface AnalysisOptions {
    period: 'week' | 'month' | 'custom';
    startDate?: string;
    endDate?: string;
    exportCSV?: boolean;
    outputDir?: string;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const dataManager = new NewsDataManager();
    const processor = new NewsDataProcessor();

    try {
        switch (command) {
            case 'week':
                await analyzeLastDays(7, dataManager);
                break;

            case 'month':
                await analyzeLastDays(30, dataManager);
                break;

            case 'dates':
                await showAvailableDates(processor);
                break;

            case 'today':
                await showTodaySummary(processor);
                break;

            case 'export':
                const startDate = args[1] || getLastWeekDate();
                const endDate = args[2] || getTodayDate();
                await exportToCSV(dataManager, startDate, endDate, args[3]);
                break;

            case 'custom':
                const customStart = args[1];
                const customEnd = args[2];
                if (!customStart || !customEnd) {
                    console.error("❌ For custom analysis, provide start and end dates: YYYY-MM-DD YYYY-MM-DD");
                    process.exit(1);
                }
                await analyzeCustomPeriod(dataManager, customStart, customEnd);
                break;

            default:
                showUsage();
                break;
        }
    } catch (error) {
        console.error("❌ Analysis failed:", error);
        process.exit(1);
    }
}

async function analyzeLastDays(days: number, dataManager: NewsDataManager) {
    console.log(`📊 Analyzing last ${days} days...`);
    const endDate = getTodayDate();
    const startDate = getDateDaysAgo(days);

    const report = await dataManager.generateAnalysisReport(startDate, endDate);
    displayAnalysisReport(report);
}

async function analyzeCustomPeriod(dataManager: NewsDataManager, startDate: string, endDate: string) {
    console.log(`📊 Analyzing period ${startDate} to ${endDate}...`);
    const report = await dataManager.generateAnalysisReport(startDate, endDate);
    displayAnalysisReport(report);
}

async function showAvailableDates(processor: NewsDataProcessor) {
    console.log("📅 Available dates with data:");
    const dates = await processor.getAvailableDates();

    if (dates.length === 0) {
        console.log("No data available. Run the pipeline first.");
        return;
    }

    console.log(`Found ${dates.length} days with data:`);
    dates.slice(0, 20).forEach((date, index) => {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${date} (${dayName})`);
    });

    if (dates.length > 20) {
        console.log(`... and ${dates.length - 20} more dates`);
    }
}

async function showTodaySummary(processor: NewsDataProcessor) {
    const today = getTodayDate();
    console.log(`📰 Today's News Summary (${today}):`);
    console.log("=".repeat(50));

    const dailyData = await processor.loadDailyData(today);
    if (!dailyData) {
        console.log("No data available for today. Run the pipeline first.");
        return;
    }

    displayDailySummary(dailyData);
}

async function exportToCSV(dataManager: NewsDataManager, startDate: string, endDate: string, outputPath?: string) {
    console.log(`📄 Exporting data from ${startDate} to ${endDate}...`);
    const filePath = await dataManager.exportToCSV(startDate, endDate, outputPath);
    console.log(`✅ Export completed: ${filePath}`);
}

function displayAnalysisReport(report: MarketAnalysisReport) {
    console.log("\n📈 MARKET ANALYSIS REPORT");
    console.log("=".repeat(60));
    console.log(`📅 Period: ${report.period.start_date} to ${report.period.end_date}`);
    console.log(`📊 Days analyzed: ${report.period.days_analyzed}`);

    console.log("\n💭 OVERALL SENTIMENT:");
    console.log(`   Bullish: ${report.overall_sentiment.bullish_percentage.toFixed(1)}%`);
    console.log(`   Bearish: ${report.overall_sentiment.bearish_percentage.toFixed(1)}%`);
    console.log(`   Neutral: ${report.overall_sentiment.neutral_percentage.toFixed(1)}%`);
    console.log(`   Dominant: ${report.overall_sentiment.dominant_sentiment.toUpperCase()}`);

    console.log("\n📰 MARKET ACTIVITY:");
    console.log(`   Total news: ${report.market_activity.total_news}`);
    console.log(`   Average per day: ${report.market_activity.average_news_per_day}`);
    console.log(`   Peak hours: ${report.market_activity.peak_hours.slice(0, 3).map(h => `${h.hour} (${h.count})`).join(', ')}`);

    console.log("\n⏰ MARKET HOURS DISTRIBUTION:");
    Object.entries(report.market_activity.market_hours_distribution).forEach(([period, count]) => {
        const percentage = ((count as number) / report.market_activity.total_news * 100).toFixed(1);
        console.log(`   ${period}: ${count} (${percentage}%)`);
    });

    console.log("\n🔥 TOP TRENDS:");
    console.log("   Keywords:");
    report.top_trends.keywords.slice(0, 10).forEach((item, index) => {
        console.log(`     ${(index + 1).toString().padStart(2, ' ')}. ${item.keyword} (${item.count} mentions)`);
    });

    console.log("\n   Sources:");
    report.top_trends.sources.forEach(source => {
        console.log(`     • ${source.source}: ${source.count} (${source.percentage.toFixed(1)}%)`);
    });

    console.log("\n📋 DAILY BREAKDOWN (Last 5 days):");
    report.daily_breakdown.slice(0, 5).forEach(day => {
        const sentimentEmoji = day.sentiment === 'bullish' ? '🟢' : day.sentiment === 'bearish' ? '🔴' : '🟡';
        console.log(`   ${day.date}: ${day.news_count} news ${sentimentEmoji} ${day.sentiment}`);
        if (day.top_keywords.length > 0) {
            console.log(`      Keywords: ${day.top_keywords.join(', ')}`);
        }
    });
}

function displayDailySummary(dailyData: any) {
    console.log(`📰 Total News: ${dailyData.total_news}`);
    console.log(`📊 Sources: ${Object.keys(dailyData.by_source).map(source => `${source} (${dailyData.by_source[source].length})`).join(', ')}`);

    console.log("\n⏰ Market Hours Distribution:");
    Object.entries(dailyData.market_hours_distribution).forEach(([period, count]) => {
        const percentage = (count as number / dailyData.total_news * 100).toFixed(1);
        console.log(`   ${period}: ${count} (${percentage}%)`);
    });

    console.log("\n💭 Sentiment Distribution:");
    Object.entries(dailyData.sentiment_distribution).forEach(([sentiment, count]) => {
        const percentage = (count as number / dailyData.total_news * 100).toFixed(1);
        console.log(`   ${sentiment}: ${count} (${percentage}%)`);
    });

    console.log("\n🔥 Top Keywords:");
    dailyData.top_keywords.slice(0, 10).forEach((item: any, index: number) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${item.keyword} (${item.count})`);
    });

    console.log("\n🕐 News by Hour:");
    const hoursByCount = Object.entries(dailyData.by_hour)
        .sort(([, a], [, b]) => (b as any[]).length - (a as any[]).length)
        .slice(0, 5);

    hoursByCount.forEach(([hour, news]: [string, any]) => {
        console.log(`   ${hour}: ${news.length} news`);
    });
}

function showUsage() {
    console.log("📊 News Data Analysis Tool");
    console.log("=" .repeat(40));
    console.log("Usage: npm run analyze [command] [options]");
    console.log("");
    console.log("Commands:");
    console.log("  week          Analyze last 7 days");
    console.log("  month         Analyze last 30 days");
    console.log("  dates         Show available dates");
    console.log("  today         Show today's summary");
    console.log("  export [start] [end] [path]    Export to CSV");
    console.log("  custom start end              Analyze custom period (YYYY-MM-DD)");
    console.log("");
    console.log("Examples:");
    console.log("  npm run analyze week");
    console.log("  npm run analyze export 2024-01-01 2024-01-31");
    console.log("  npm run analyze custom 2024-01-15 2024-01-20");
}

// Helper functions
function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

function getLastWeekDate(): string {
    return getDateDaysAgo(7);
}

main();