import { NewsDataProcessor, DailyNewsSummary, ProcessedNewsData } from './NewsDataProcessor';
import { NewsItem } from '../ingestion/NewsAggregator';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MarketAnalysisReport {
    period: {
        start_date: string;
        end_date: string;
        days_analyzed: number;
    };
    overall_sentiment: {
        bullish_percentage: number;
        bearish_percentage: number;
        neutral_percentage: number;
        dominant_sentiment: 'bullish' | 'bearish' | 'neutral';
    };
    market_activity: {
        total_news: number;
        average_news_per_day: number;
        peak_hours: Array<{ hour: string; count: number }>;
        market_hours_distribution: any;
    };
    top_trends: {
        keywords: Array<{ keyword: string; count: number; trend: 'up' | 'down' | 'stable' }>;
        sources: Array<{ source: string; count: number; percentage: number }>;
    };
    daily_breakdown: Array<{
        date: string;
        news_count: number;
        sentiment: string;
        top_keywords: string[];
    }>;
}

export class NewsDataManager {
    private processor: NewsDataProcessor;

    constructor() {
        this.processor = new NewsDataProcessor();
    }

    /**
     * Exécute le pipeline complet de traitement des nouvelles
     */
    async runDailyNewsPipeline(): Promise<void> {
        console.log("🚀 Starting daily news processing pipeline...");

        // Importer le NewsAggregator ici pour éviter les imports circulaires
        const { NewsAggregator } = await import('../ingestion/NewsAggregator');
        const aggregator = new NewsAggregator();

        // 1. Récupérer les nouvelles des 3 sources
        console.log("📰 Fetching news from sources...");
        const [zeroHedge, cnbc, financialJuice] = await Promise.all([
            aggregator.fetchZeroHedgeHeadlines(),
            aggregator.fetchCNBCMarketNews(),
            aggregator.fetchFinancialJuice()
        ]);

        const allNews = [...zeroHedge, ...cnbc, ...financialJuice];
        console.log(`📊 Fetched ${allNews.length} news items`);

        // 2. Traiter et nettoyer les données
        console.log("🧹 Processing and cleaning news data...");
        const processedNews = await this.processor.processNews(allNews);
        console.log(`✅ Processed ${processedNews.length} valid news items`);

        // 3. Sauvegarder les données traitées
        console.log("💾 Saving processed data...");
        await this.processor.saveProcessedNews(processedNews);

        // 4. Afficher les statistiques
        await this.displayTodayStats();

        console.log("✅ Daily news pipeline completed successfully!");
    }

    /**
     * Affiche les statistiques du jour
     */
    private async displayTodayStats(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const dailyData = await this.processor.loadDailyData(today);

        if (!dailyData) {
            console.log("No data available for today");
            return;
        }

        console.log("\n📈 TODAY'S MARKET NEWS SUMMARY");
        console.log("=".repeat(50));
        console.log(`📰 Total News: ${dailyData.total_news}`);
        console.log(`📊 Sources: ${Object.keys(dailyData.by_source).join(', ')}`);
        console.log(`🕐 Hours with most news: ${this.getPeakHours(dailyData.by_hour)}`);
        console.log(`🎯 Top Keywords: ${dailyData.top_keywords.slice(0, 5).map(k => k.keyword).join(', ')}`);
        console.log(`⏰ Market Hours Distribution:`, dailyData.market_hours_distribution);
        console.log(`💭 Sentiment:`, dailyData.sentiment_distribution);
    }

    /**
     * Retourne les heures avec le plus de news
     */
    private getPeakHours(byHour: Record<string, ProcessedNewsData[]>): string {
        const hours = Object.entries(byHour)
            .sort(([, a], [, b]) => b.length - a.length)
            .slice(0, 3)
            .map(([hour]) => hour);
        return hours.join(', ') || 'N/A';
    }

    /**
     * Génère un rapport d'analyse pour une période donnée
     */
    async generateAnalysisReport(startDate: string, endDate: string): Promise<MarketAnalysisReport> {
        const availableDates = await this.processor.getAvailableDates();
        const dateRange = availableDates.filter(date => date >= startDate && date <= endDate);

        if (dateRange.length === 0) {
            throw new Error(`No data available for period ${startDate} to ${endDate}`);
        }

        const dailySummaries: DailyNewsSummary[] = [];
        for (const date of dateRange) {
            const summary = await this.processor.loadDailyData(date);
            if (summary) {
                dailySummaries.push(summary);
            }
        }

        return this.createAnalysisReport(dateRange, dailySummaries);
    }

    /**
     * Crée un rapport d'analyse à partir des résumés quotidiens
     */
    private createAnalysisReport(dates: string[], summaries: DailyNewsSummary[]): MarketAnalysisReport {
        const totalNews = summaries.reduce((sum, day) => sum + day.total_news, 0);
        const avgNewsPerDay = totalNews / summaries.length;

        // Agréger les sentiments
        const totalSentiment = summaries.reduce((acc, day) => {
            acc.bullish += day.sentiment_distribution.bullish;
            acc.bearish += day.sentiment_distribution.bearish;
            acc.neutral += day.sentiment_distribution.neutral;
            acc.unknown += day.sentiment_distribution.unknown;
            return acc;
        }, { bullish: 0, bearish: 0, neutral: 0, unknown: 0 });

        const totalSentimentCount = totalSentiment.bullish + totalSentiment.bearish + totalSentiment.neutral;
        const dominantSentiment = totalSentiment.bullish > totalSentiment.bearish ? 'bullish' : 'bearish';

        // Agréger les mots-clés
        const keywordCounts: Record<string, number> = {};
        summaries.forEach(day => {
            day.top_keywords.forEach(({ keyword, count }) => {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + count;
            });
        });

        const topKeywords = Object.entries(keywordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([keyword, count]) => ({ keyword, count, trend: 'stable' as const }));

        // Agréger les sources
        const sourceCounts: Record<string, number> = {};
        summaries.forEach(day => {
            Object.entries(day.by_source).forEach(([source, news]) => {
                sourceCounts[source] = (sourceCounts[source] || 0) + news.length;
            });
        });

        const topSources = Object.entries(sourceCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([source, count]) => ({ source, count, percentage: (count / totalNews) * 100 }));

        // Agréger les heures
        const hourCounts: Record<string, number> = {};
        summaries.forEach(day => {
            Object.entries(day.by_hour).forEach(([hour, news]) => {
                hourCounts[hour] = (hourCounts[hour] || 0) + news.length;
            });
        });

        const peakHours = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([hour, count]) => ({ hour, count }));

        // Distribution des heures de marché
        const marketHoursDistribution = summaries.reduce((acc, day) => {
            acc['pre-market'] += day.market_hours_distribution['pre-market'];
            acc['market'] += day.market_hours_distribution['market'];
            acc['after-hours'] += day.market_hours_distribution['after-hours'];
            acc['extended'] += day.market_hours_distribution['extended'];
            return acc;
        }, { 'pre-market': 0, 'market': 0, 'after-hours': 0, 'extended': 0 });

        // Breakdown quotidien
        const dailyBreakdown = summaries.map(day => ({
            date: day.date,
            news_count: day.total_news,
            sentiment: this.getDailySentiment(day.sentiment_distribution),
            top_keywords: day.top_keywords.slice(0, 3).map(k => k.keyword)
        }));

        return {
            period: {
                start_date: dates[dates.length - 1],
                end_date: dates[0],
                days_analyzed: summaries.length
            },
            overall_sentiment: {
                bullish_percentage: (totalSentiment.bullish / totalSentimentCount) * 100,
                bearish_percentage: (totalSentiment.bearish / totalSentimentCount) * 100,
                neutral_percentage: (totalSentiment.neutral / totalSentimentCount) * 100,
                dominant_sentiment: dominantSentiment
            },
            market_activity: {
                total_news: totalNews,
                average_news_per_day: Math.round(avgNewsPerDay * 10) / 10,
                peak_hours: peakHours,
                market_hours_distribution: marketHoursDistribution
            },
            top_trends: {
                keywords: topKeywords,
                sources: topSources
            },
            daily_breakdown: dailyBreakdown
        };
    }

    /**
     * Détermine le sentiment dominant d'une journée
     */
    private getDailySentiment(distribution: any): string {
        const { bullish, bearish, neutral } = distribution;
        if (bullish > bearish && bullish > neutral) return 'bullish';
        if (bearish > bullish && bearish > neutral) return 'bearish';
        return 'neutral';
    }

    /**
     * Exporte les données en format CSV pour analyse externe
     */
    async exportToCSV(startDate: string, endDate: string, outputPath?: string): Promise<string> {
        const availableDates = await this.processor.getAvailableDates();
        const dateRange = availableDates.filter(date => date >= startDate && date <= endDate);

        const csvRows: string[] = [];
        csvRows.push('Date,Hour,Source,Title,Sentiment,MarketHours,Keywords');

        for (const date of dateRange) {
            const summary = await this.processor.loadDailyData(date);
            if (!summary) continue;

            for (const [hour, newsList] of Object.entries(summary.by_hour)) {
                for (const news of newsList) {
                    const row = [
                        date,
                        hour,
                        news.source,
                        `"${news.title.replace(/"/g, '""')}"`,
                        news.sentiment || 'unknown',
                        news.market_hours,
                        `"${news.keywords.join('; ')}"`
                    ].join(',');
                    csvRows.push(row);
                }
            }
        }

        const csvContent = csvRows.join('\n');
        const defaultPath = path.join(process.cwd(), 'data', 'exports', `news_${startDate}_to_${endDate}.csv`);
        const finalPath = outputPath || defaultPath;

        // Assurer que le répertoire d'export existe
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.writeFile(finalPath, csvContent, 'utf-8');

        console.log(`📄 Exported CSV to: ${finalPath}`);
        return finalPath;
    }
}