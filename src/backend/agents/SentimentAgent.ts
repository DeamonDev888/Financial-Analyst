import { BaseAgent } from './BaseAgent';
import { NewsAggregator, NewsItem } from '../ingestion/NewsAggregator';
import { NewsDatabaseService, DatabaseNewsItem } from '../database/NewsDatabaseService';
import { ToonFormatter } from '../utils/ToonFormatter';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SentimentAgent extends BaseAgent {
    private newsAggregator: NewsAggregator;
    private dbService: NewsDatabaseService;

    constructor() {
        super('sentiment-agent');
        this.newsAggregator = new NewsAggregator();
        this.dbService = new NewsDatabaseService();
    }

    /**
     * Exécute le cycle complet d'analyse de sentiment avec cache intelligent :
     * 1. Vérifier le cache de base de données
     * 2. Si le cache est frais, utiliser les données existantes
     * 3. Sinon, scraper les sources et mettre à jour le cache
     * 4. Formatage TOON et analyse AI
     */
    async analyzeMarketSentiment(forceRefresh: boolean = false): Promise<any> {
        console.log(`[${this.agentName}] Starting market sentiment analysis...`);

        try {
            // 1. Tester la connexion à la base de données
            const dbConnected = await this.dbService.testConnection();

            let allNews: NewsItem[] = [];
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
                    // 5. Sauvegarder dans la base de données
                    const savedCount = await this.dbService.saveNewsItems(allNews);
                    console.log(`[${this.agentName}] Saved ${savedCount} new items to database`);
                }
            }

            if (allNews.length === 0) {
                return {
                    sentiment: 'NEUTRAL',
                    score: 0,
                    confidence: 0,
                    summary: 'No news data available from any source.',
                    data_source: 'none'
                };
            }

            // 6. Analyser les sentiments
            const result = await this.performSentimentAnalysis(allNews, useCache);

            // 7. Sauvegarder l'analyse si base de données disponible
            if (dbConnected) {
                try {
                    await this.dbService.saveSentimentAnalysis(result);
                    console.log(`[${this.agentName}] Analysis saved to database`);
                } catch (error) {
                    console.error(`[${this.agentName}] Failed to save analysis:`, error);
                }
            }

            return {
                ...result,
                data_source: useCache ? 'database_cache' : 'fresh_scraping',
                news_count: allNews.length
            };

        } catch (error) {
            console.error(`[${this.agentName}] Analysis failed:`, error);
            return {
                sentiment: 'NEUTRAL',
                score: 0,
                confidence: 0,
                summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                data_source: 'error'
            };
        }
    }

    /**
     * Scrape les nouvelles fraîches depuis les sources
     */
    private async scrapeFreshNews(): Promise<NewsItem[]> {
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
            const allNews: NewsItem[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allNews.push(...result.value);
                    // Mettre à jour le statut de la source
                    this.dbService.updateSourceStatus(sources[index], true);
                } else {
                    console.error(`[${this.agentName}] Failed to scrape ${sources[index]}:`, result.reason);
                    this.dbService.updateSourceStatus(sources[index], false, result.reason instanceof Error ? result.reason.message : 'Unknown error');
                }
            });

            console.log(`[${this.agentName}] Scraped ${allNews.length} headlines (ZH: ${counts[0]}, CNBC: ${counts[1]}, FJ: ${counts[2]})`);
            return allNews;

        } catch (error) {
            console.error(`[${this.agentName}] Scraping failed:`, error);
            return [];
        }
    }

    /**
     * Effectue l'analyse de sentiment sur les données
     */
    private async performSentimentAnalysis(newsItems: NewsItem[], useCache: boolean): Promise<any> {
        console.log(`[${this.agentName}] Analyzing ${newsItems.length} news items (${useCache ? 'from cache' : 'fresh'})...`);

        // 1. Conversion en format TOON
        const toonData = ToonFormatter.arrayToToon('headlines', newsItems.map(n => ({
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
        // On injecte directement les données pour éviter que l'IA ne demande "Que faire avec ce fichier ?"
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

        // 5. Appel à KiloCode (Mode Pipe/Stream)
        console.log(`[${this.agentName}] Sending request to KiloCode...`);

        const analysisResult = await this.callKiloCode({
            prompt: prompt,
            // inputFile retiré car données intégrées au prompt
            outputFile: `data/agent-data/${this.agentName}/sentiment_analysis.json`,
        });

        return analysisResult;
    }

    /**
     * Force le rafraîchissement du cache
     */
    async refreshCache(): Promise<void> {
        console.log(`[${this.agentName}] Forcing cache refresh...`);
        await this.analyzeMarketSentiment(true);
    }

    /**
     * Obtient les statistiques de la base de données
     */
    async getDatabaseStats(): Promise<any> {
        try {
            const dbConnected = await this.dbService.testConnection();
            if (!dbConnected) {
                return { error: 'Database not connected' };
            }

            return await this.dbService.getDatabaseStats();
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Nettoie les anciennes données
     */
    async cleanupOldData(daysToKeep: number = 30): Promise<void> {
        try {
            const dbConnected = await this.dbService.testConnection();
            if (dbConnected) {
                await this.dbService.cleanupOldData(daysToKeep);
                console.log(`[${this.agentName}] Cleaned up data older than ${daysToKeep} days`);
            }
        } catch (error) {
            console.error(`[${this.agentName}] Cleanup failed:`, error);
        }
    }

    /**
     * Ferme les connexions
     */
    async cleanup(): Promise<void> {
        try {
            await this.dbService.close();
        } catch (error) {
            console.error(`[${this.agentName}] Cleanup failed:`, error);
        }
    }
}
