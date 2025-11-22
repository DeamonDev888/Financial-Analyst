"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentAgentSimple = void 0;
const BaseAgentSimple_1 = require("./BaseAgentSimple");
const NewsAggregator_1 = require("../ingestion/NewsAggregator");
const NewsDatabaseService_1 = require("../database/NewsDatabaseService");
const ToonFormatter_1 = require("../utils/ToonFormatter");
class SentimentAgentSimple extends BaseAgentSimple_1.BaseAgentSimple {
    newsAggregator;
    dbService;
    constructor() {
        super('sentiment-agent-simple');
        this.newsAggregator = new NewsAggregator_1.NewsAggregator();
        this.dbService = new NewsDatabaseService_1.NewsDatabaseService();
    }
    /**
     * Analyse de sentiment robuste avec fallback N/A
     */
    async analyzeMarketSentiment(forceRefresh = false) {
        console.log(`[${this.agentName}] Starting market sentiment analysis...`);
        try {
            // 1. Tester la connexion à la base de données
            const dbConnected = await this.dbService.testConnection();
            let allNews = [];
            let useCache = false;
            if (dbConnected && !forceRefresh) {
                // 2. Vérifier si le cache est frais
                const cacheFresh = await this.dbService.isCacheFresh(2); // 2 heures
                console.log(`[${this.agentName}] Database cache status: ${cacheFresh ? 'FRESH' : 'STALE'}`);
                if (cacheFresh) {
                    const cachedNews = await this.dbService.getNewsForAnalysis(24);
                    allNews = cachedNews.map(item => ({
                        title: item.title,
                        url: item.url,
                        source: item.source,
                        timestamp: item.timestamp || new Date(),
                        sentiment: item.sentiment
                    }));
                    useCache = true;
                    console.log(`[${this.agentName}] Using ${allNews.length} cached news items`);
                }
            }
            if (allNews.length === 0) {
                // 3. Scraper les nouvelles sources si le cache est vide ou stale
                console.log(`[${this.agentName}] Scraping fresh news data...`);
                allNews = await this.scrapeFreshNews();
                if (dbConnected && allNews.length > 0) {
                    await this.dbService.saveNewsItems(allNews);
                }
            }
            if (allNews.length === 0) {
                console.log(`[${this.agentName}] No news data available`);
                return this.createNotAvailableResult('No news data from any source');
            }
            // 4. Analyser les sentiments
            console.log(`[${this.agentName}] Analyzing ${allNews.length} news items (${useCache ? 'from cache' : 'fresh'})...`);
            const result = await this.performSentimentAnalysis(allNews, useCache);
            // 5. Sauvegarder l'analyse si base de données disponible
            if (dbConnected) {
                await this.dbService.saveSentimentAnalysis(result);
            }
            return {
                ...result,
                data_source: useCache ? 'database_cache' : 'fresh_scraping',
                news_count: allNews.length
            };
        }
        catch (error) {
            console.error(`[${this.agentName}] Analysis failed:`, error);
            return this.createNotAvailableResult(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Crée un résultat N/A standard
     */
    createNotAvailableResult(reason) {
        return {
            sentiment: 'N/A',
            score: null,
            catalysts: [],
            risk_level: 'N/A',
            summary: `Analysis not available: ${reason}`,
            data_source: 'error',
            news_count: 0
        };
    }
    /**
     * Scrape les nouvelles fraîches depuis les sources
     */
    async scrapeFreshNews() {
        const sources = ['ZeroHedge', 'CNBC', 'FinancialJuice'];
        console.log(`[${this.agentName}] Scraping from ${sources.join(', ')}...`);
        try {
            const [zeroHedge, cnbc, financialJuice] = await Promise.allSettled([
                this.newsAggregator.fetchZeroHedgeHeadlines(),
                this.newsAggregator.fetchCNBCMarketNews(),
                this.newsAggregator.fetchFinancialJuice()
            ]);
            const results = [zeroHedge, cnbc, financialJuice];
            const counts = results.map(r => r.status === 'fulfilled' ? r.value.length : 0);
            const allNews = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allNews.push(...result.value);
                    this.dbService.updateSourceStatus(sources[index], true);
                }
                else {
                    console.error(`[${this.agentName}] Failed to scrape ${sources[index]}:`, result.reason);
                    this.dbService.updateSourceStatus(sources[index], false, result.reason instanceof Error ? result.reason.message : 'Unknown error');
                }
            });
            console.log(`[${this.agentName}] Scraped ${allNews.length} headlines (ZH: ${counts[0]}, CNBC: ${counts[1]}, FJ: ${counts[2]})`);
            return allNews;
        }
        catch (error) {
            console.error(`[${this.agentName}] Scraping failed:`, error);
            return [];
        }
    }
    /**
     * Effectue l'analyse de sentiment sur les données
     */
    async performSentimentAnalysis(newsItems, useCache) {
        console.log(`[${this.agentName}] Analyzing ${newsItems.length} news items (${useCache ? 'from cache' : 'fresh'})...`);
        try {
            // Conversion en format TOON
            const toonData = ToonFormatter_1.ToonFormatter.arrayToToon('headlines', newsItems.map(n => ({
                title: n.title,
                src: n.source
            })));
            // Affichage des données pour l'utilisateur
            console.log("\nDATA:");
            console.log(toonData);
            console.log("\n");
            // Construction du Prompt optimisé
            const prompt = `
You are an expert Market Sentiment Analyst for ES Futures (S&P 500).

TASK:
Analyze the provided TOON data below and return the result in strict JSON format.

CRITICAL INSTRUCTIONS:
1. Output ONLY valid JSON.
2. Do NOT use Markdown code blocks (no \\`;
            `\\`;
            json;
            3.;
            Do;
            NOT;
            include;
            any;
            reasoning;
            or;
            conversational;
            text.
            ;
            4.;
            The;
            output;
            must;
            be;
            parseable;
            by;
            JSON.parse().
            ;
            EXAMPLE;
            OUTPUT: {
                "sentiment";
                "BULLISH",
                    "score";
                75,
                    "catalysts";
                ["Fed Rate Cut", "AI Tech Rally"],
                    "risk_level";
                "LOW",
                    "summary";
                "Market is rallying due to dovish Fed and strong AI sector performance.";
            }
            JSON;
            STRUCTURE: {
                "sentiment";
                "BULLISH" | "BEARISH" | "NEUTRAL",
                    "score";
                number, // Integer between -100 and 100
                    "catalysts";
                ["string", "string", "string"], // Top 3 drivers
                    "risk_level";
                "LOW" | "MEDIUM" | "HIGH",
                    "summary";
                "Brief explanation of the verdict";
            }
            DATA;
            TO;
            ANALYZE: $;
            {
                toonData;
            }
            /toon_data>;
            REMINDER: 1.;
            Analyze;
            the;
            data;
            above.
            ;
            2.;
            Output;
            ONLY;
            the;
            JSON;
            object;
            defined in "JSON STRUCTURE".
            ;
            3.;
            NO;
            introductory;
            text.NO;
            markdown.NO;
            explanations;
            outside;
            the;
            JSON.
             `;

            console.log(`[$];
            {
                this.agentName;
            }
            Sending;
            request;
            to;
            KiloCode;
            `);

            // Appel à KiloCode avec le BaseAgentSimple robuste
            const result = await this.callKiloCode({
                prompt: prompt,
                outputFile: `;
            data / agent - data / $;
            {
                this.agentName;
            }
            /sentiment_analysis.json`,;
        }
        finally { }
        ;
        console.log(`[${this.agentName}] KiloCode analysis completed successfully`);
        return result;
    }
    catch(error) {
        console.error(`[${this.agentName}] Sentiment analysis error:`, error);
        return this.createNotAvailableResult(`Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
exports.SentimentAgentSimple = SentimentAgentSimple;
/**
 * Force le rafraîchissement du cache
 */
async;
refreshCache();
Promise < void  > {
    console, : .log(`[${this.agentName}] Forcing cache refresh...`),
    await, this: .analyzeMarketSentiment(true)
};
/**
 * Nettoie les anciennes données
 */
async;
cleanupOldData(daysToKeep, number = 30);
Promise < void  > {
    try: {
        const: dbConnected = await this.dbService.testConnection(),
        if(dbConnected) {
            await this.dbService.cleanupOldData(daysToKeep);
            console.log(`[${this.agentName}] Cleaned up data older than ${daysToKeep} days`);
        }
    }, catch(error) {
        console.error(`[${this.agentName}] Cleanup failed:`, error);
    }
};
/**
 * Ferme les connexions
 */
async;
cleanup();
Promise < void  > {
    try: {
        await, this: .dbService.close()
    }, catch(error) {
        console.error(`[${this.agentName}] Cleanup failed:`, error);
    }
};
