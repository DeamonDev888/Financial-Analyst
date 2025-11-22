"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentAgent = void 0;
const BaseAgent_1 = require("./BaseAgent");
const NewsAggregator_1 = require("../ingestion/NewsAggregator");
const NewsDatabaseService_1 = require("../database/NewsDatabaseService");
const ToonFormatter_1 = require("../utils/ToonFormatter");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class SentimentAgent extends BaseAgent_1.BaseAgent {
    newsAggregator;
    dbService;
    constructor() {
        super('sentiment-agent');
        this.newsAggregator = new NewsAggregator_1.NewsAggregator();
        this.dbService = new NewsDatabaseService_1.NewsDatabaseService();
    }
    /**
     * Exécute le cycle complet d'analyse de sentiment avec cache intelligent.
     * Retourne "N/A" si l'analyse échoue, sans fallback ou données simulées.
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
                    // 3. Utiliser les données du cache
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
                // 4. Scraper les nouvelles sources si le cache est vide ou stale
                console.log(`[${this.agentName}] Scraping fresh news data...`);
                allNews = await this.scrapeFreshNews();
                if (dbConnected && allNews.length > 0) {
                    // 5. Sauvegarder dans la base de données (silencieux)
                    await this.dbService.saveNewsItems(allNews);
                }
            }
            if (allNews.length === 0) {
                console.log(`[${this.agentName}] No news data available`);
                return this.createNotAvailableResult('No news data from any source');
            }
            // 6. Analyser les sentiments
            console.log(`[${this.agentName}] Analyzing ${allNews.length} news items (${useCache ? 'from cache' : 'fresh'})...`);
            const result = await this.performSentimentAnalysis(allNews, useCache);
            // 7. Sauvegarder l'analyse si base de données disponible (silencieux)
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
            // Agrégation parallèle des données
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
                    // Mettre à jour le statut de la source
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
            // 1. Conversion en format TOON
            const toonData = ToonFormatter_1.ToonFormatter.arrayToToon('headlines', newsItems.map(n => ({
                title: n.title,
                src: n.source
            })));
            // 3. Sauvegarde du contexte TOON dans un fichier pour éviter les problèmes de CLI
            const contextFilePath = `data/agent-data/${this.agentName}/context.toon`;
            const fullContextPath = path.join(process.cwd(), contextFilePath);
            // Affichage des données pour l'utilisateur (Feedback visuel)
            console.log("\nDATA:");
            console.log(toonData);
            console.log("\n");
            // Assurer que le dossier existe
            await fs.mkdir(path.dirname(fullContextPath), { recursive: true });
            await fs.writeFile(fullContextPath, toonData, 'utf-8');
            // 4. Construction du Prompt (Instructions + Données intégrées)
            const prompt = `
You are an expert Market Sentiment Analyst for ES Futures (S&P 500).

TASK:
Analyze the provided TOON data below and return the result in strict JSON format.

CRITICAL INSTRUCTIONS:
1. Output ONLY valid JSON.
2. Do NOT use Markdown code blocks (no \`\`\`json).
3. Do NOT include any reasoning or conversational text.
4. The output must be parseable by JSON.parse().

EXAMPLE INPUT:
headlines[2]{title,src}:
  Fed Cuts Rates by 50bps,CNBC
  Tech Stocks Rally on AI News,ZeroHedge

EXAMPLE OUTPUT:
{
  "sentiment": "BULLISH",
  "score": 75,
  "catalysts": ["Fed Rate Cut", "AI Tech Rally"],
  "risk_level": "LOW",
  "summary": "Market is rallying due to dovish Fed and strong AI sector performance."
}

JSON STRUCTURE:
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "score": number, // Integer between -100 and 100
  "catalysts": ["string", "string", "string"], // Top 3 drivers
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "summary": "Brief explanation of the verdict"
}

DATA TO ANALYZE:
<toon_data>
${toonData}
</toon_data>

REMINDER:
1. Analyze the data above.
2. Output ONLY the JSON object defined in "JSON STRUCTURE".
3. NO introductory text. NO markdown. NO explanations outside the JSON.
`;
            // 5. Appel à KiloCode (Mode Pipe/Stream) avec timeout
            console.log(`[${this.agentName}] Sending request to KiloCode...`);
            // Ajout d'un timeout pour éviter les blocages indéfinis
            const analysisPromise = this.callKiloCode({
                prompt: prompt,
                // inputFile retiré car données intégrées au prompt
                outputFile: `data/agent-data/${this.agentName}/sentiment_analysis.json`,
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Analysis timeout after 120 seconds')), 120000); // 2 minutes
            });
            const analysisResult = await Promise.race([analysisPromise, timeoutPromise]);
            return analysisResult;
        }
        catch (error) {
            console.error(`[${this.agentName}] Sentiment analysis error:`, error);
            // Retourner N/A au lieu de propager l'erreur
            return this.createNotAvailableResult(`Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Force le rafraîchissement du cache
     */
    async refreshCache() {
        console.log(`[${this.agentName}] Forcing cache refresh...`);
        await this.analyzeMarketSentiment(true);
    }
    /**
     * Obtient les statistiques de la base de données
     */
    async getDatabaseStats() {
        try {
            const dbConnected = await this.dbService.testConnection();
            if (!dbConnected) {
                return { error: 'Database not connected' };
            }
            return await this.dbService.getDatabaseStats();
        }
        catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Nettoie les anciennes données
     */
    async cleanupOldData(daysToKeep = 30) {
        try {
            const dbConnected = await this.dbService.testConnection();
            if (dbConnected) {
                await this.dbService.cleanupOldData(daysToKeep);
                console.log(`[${this.agentName}] Cleaned up data older than ${daysToKeep} days`);
            }
        }
        catch (error) {
            console.error(`[${this.agentName}] Cleanup failed:`, error);
        }
    }
    /**
     * Ferme les connexions
     */
    async cleanup() {
        try {
            await this.dbService.close();
        }
        catch (error) {
            console.error(`[${this.agentName}] Cleanup failed:`, error);
        }
    }
}
exports.SentimentAgent = SentimentAgent;
