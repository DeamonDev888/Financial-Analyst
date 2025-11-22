import { BaseAgentSimple } from './BaseAgentSimple';
import { NewsAggregator, NewsItem } from '../ingestion/NewsAggregator';
import { NewsDatabaseService, DatabaseNewsItem } from '../database/NewsDatabaseService';
import { ToonFormatter } from '../utils/ToonFormatter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

export class SentimentAgentFinal extends BaseAgentSimple {
    private newsAggregator: NewsAggregator;
    private dbService: NewsDatabaseService;
    private execAsync: any;

    constructor() {
        super('sentiment-agent-final');
        this.newsAggregator = new NewsAggregator();
        this.dbService = new NewsDatabaseService();
        this.execAsync = promisify(exec);
    }

    /**
     * Analyse de sentiment robuste et finale
     */
    async analyzeMarketSentiment(forceRefresh: boolean = false): Promise<any> {
        console.log(`[${this.agentName}] Starting ROBUST market sentiment analysis...`);

        try {
            // 1. Tester la connexion à la base de données
            const dbConnected = await this.dbService.testConnection();

            let allNews: NewsItem[] = [];
            let useCache = false;

            if (dbConnected && !forceRefresh) {
                const cacheFresh = await this.dbService.isCacheFresh(2);
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

            // 2. Analyser les sentiments avec la solution finale robuste
            console.log(`[${this.agentName}] Analyzing ${allNews.length} news items (${useCache ? 'from cache' : 'fresh'})...`);
            const result = await this.performRobustSentimentAnalysis(allNews, useCache);

            // 3. Sauvegarder si base de données disponible
            if (dbConnected) {
                await this.dbService.saveSentimentAnalysis(result);
            }

            return {
                ...result,
                data_source: useCache ? 'database_cache' : 'fresh_scraping',
                news_count: allNews.length,
                analysis_method: 'robust_kilocode_v2'
            };

        } catch (error) {
            console.error(`[${this.agentName}] Analysis failed:`, error);
            return this.createNotAvailableResult(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Crée un résultat N/A standard
     */
    private createNotAvailableResult(reason: string): any {
        return {
            sentiment: 'N/A',
            score: null,
            catalysts: [],
            risk_level: 'N/A',
            summary: `Analysis not available: ${reason}`,
            data_source: 'error',
            news_count: 0,
            analysis_method: 'none'
        };
    }

    /**
     * Scraping robust des nouvelles
     */
    private async scrapeFreshNews(): Promise<NewsItem[]> {
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
            const allNews: NewsItem[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allNews.push(...result.value);
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
     * Analyse finale robuste avec fallback multiples
     */
    private async performRobustSentimentAnalysis(newsItems: NewsItem[], useCache: boolean): Promise<any> {
        console.log(`[${this.agentName}] Starting ROBUST analysis with fallback methods...`);

        // 1. Créer le prompt optimisé
        const toonData = ToonFormatter.arrayToToon('headlines', newsItems.map(n => ({
            title: n.title,
            src: n.source
        })));

        const prompt = this.createOptimizedPrompt(toonData);

        console.log(`[${this.agentName}] Prompt length: ${prompt.length} chars`);

        // Afficher le prompt complet pour débogage
        console.log(`\n[${this.agentName}] 🔍 COMPLETE PROMPT SENT TO KILOCODE:`);
        console.log("="*repeat(80));
        console.log(prompt);
        console.log("="*repeat(80));

        // 2. Tenter l'analyse avec plusieurs approches
        try {
            return await this.tryKiloCodeApproaches(prompt);
        } catch (kilocodeError) {
            console.warn(`[${this.agentName}] KiloCode failed: ${kilocodeError instanceof Error ? kilocodeError.message : 'Unknown error'}`);

            // 3. Fallback: Analyse simple basée sur patterns
            return this.performPatternBasedAnalysis(newsItems);
        }
    }

    /**
     * Crée le prompt optimisé pour KiloCode
     */
    private createOptimizedPrompt(toonData: string): string {
        return `
You are an expert Market Sentiment Analyst for ES Futures (S&P 500).

TASK:
Analyze the provided TOON data and return valid JSON.

CRITICAL:
- Output ONLY the JSON object
- No markdown, no explanations
- Must be parseable by JSON.parse()

EXAMPLE:
{
  "sentiment": "BEARISH",
  "score": -25,
  "catalysts": ["Bitcoin decline", "Fed hawkish"],
  "risk_level": "HIGH",
  "summary": "Market sentiment is negative due to..."
}

STRUCTURE:
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "score": number between -100 and 100,
  "catalysts": ["string", "string"],
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "summary": "Brief explanation"
}

DATA:
${toonData}

RULES:
1. Analyze all headlines
2. Return ONLY JSON
3. No conversational text
`;
    }

    /**
     * Essaie plusieurs approches KiloCode avec gestion d'erreur robuste
     */
    private async tryKiloCodeApproaches(prompt: string): Promise<any> {
        const attempts = [
            () => this.tryKiloCodeWithFile(prompt),
            () => this.tryKiloCodeInline(prompt),
            () => this.tryKiloCodeWithEcho(prompt)
        ];

        for (let i = 0; i < attempts.length; i++) {
            try {
                console.log(`[${this.agentName}] Trying KiloCode approach ${i + 1}/${attempts.length}...`);
                const result = await attempts[i]();
                console.log(`[${this.agentName}] ✅ Approach ${i + 1} successful!`);
                return result;
            } catch (error) {
                console.warn(`[${this.agentName}] Approach ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                if (i === attempts.length - 1) throw error;
            }
        }

        throw new Error('All KiloCode approaches failed');
    }

    /**
     * Approche 1: Fichier temporaire (la plus fiable)
     */
    private async tryKiloCodeWithFile(prompt: string): Promise<any> {
        const tempPath = `temp_analysis_${Date.now()}.txt`;
        await fs.writeFile(tempPath, prompt, 'utf-8');

        try {
            // Utiliser la commande Windows appropriée (type sur Windows, cat sur Linux/Mac)
            const isWindows = process.platform === 'win32';
            const readCommand = isWindows ? `type "${tempPath}"` : `cat "${tempPath}"`;
            const command = `${readCommand} | kilocode -m ask --auto --json`;

            console.log(`[${this.agentName}] Using command: ${readCommand} | kilocode`);

            const { stdout } = await this.execAsync(command, {
                timeout: 90000,
                cwd: process.cwd()
            });

            return this.parseRobustOutput(stdout);
        } finally {
            await fs.unlink(tempPath).catch(() => {});
        }
    }

    /**
     * Approche 2: En ligne de commande (limite de taille)
     */
    private async tryKiloCodeInline(prompt: string): Promise<any> {
        if (prompt.length > 5000) {
            throw new Error('Prompt too long for inline method');
        }

        const escapedPrompt = prompt.replace(/"/g, '\\"');
        const command = `kilocode -m ask --auto --json "${escapedPrompt}"`;

        const { stdout } = await this.execAsync(command, {
            timeout: 60000,
            cwd: process.cwd()
        });

        return this.parseRobustOutput(stdout);
    }

    /**
     * Approche 3: Via echo (alternative)
     */
    private async tryKiloCodeWithEcho(prompt: string): Promise<any> {
        const command = `echo '${prompt.replace(/'/g, "\\'")}' | kilocode -m ask --auto --json`;

        const { stdout } = await this.execAsync(command, {
            timeout: 60000,
            cwd: process.cwd()
        });

        return this.parseRobustOutput(stdout);
    }

    /**
     * Parsing robust avec nettoyage ANSI et fallback multiples
     */
    private parseRobustOutput(stdout: string): any {
        console.log(`[${this.agentName}] Parsing robust output (${stdout.length} chars)...`);

        try {
            // Nettoyer les séquences ANSI
            const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '')  // Remove ANSI color codes
                                         .replace(/\x1b\[[0-9;]*[A-Z]/g, '')  // Remove ANSI control sequences
                                         .replace(/\x1b\[.*?[A-Za-z]/g, '');  // Remove all remaining ANSI sequences

            // Parser NDJSON
            const lines = cleanOutput.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                try {
                    const event = JSON.parse(line);

                    // Priorité: metadata JSON (le plus fiable)
                    if (event.metadata && (event.metadata.sentiment || event.metadata.score || event.metadata.catalysts)) {
                        return this.validateSentimentResult(event.metadata);
                    }

                    // Deuxième: completion_result content
                    if (event.type === 'completion_result' && event.content) {
                        const parsed = this.extractJsonFromContent(event.content);
                        if (parsed) return this.validateSentimentResult(parsed);
                    }

                    // Troisième: text content (pas reasoning)
                    if (event.type === 'say' && event.say !== 'reasoning' && event.content) {
                        const parsed = this.extractJsonFromContent(event.content);
                        if (parsed) return this.validateSentimentResult(parsed);
                    }
                } catch (e) {
                    // Ignorer les lignes non-JSON
                }
            }

            // Fallback: chercher JSON dans tout le texte
            const fallbackParsed = this.extractJsonFromContent(cleanOutput);
            if (fallbackParsed) {
                return this.validateSentimentResult(fallbackParsed);
            }

        } catch (error) {
            console.warn(`[${this.agentName}] NDJSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        throw new Error('No valid JSON found in any method');
    }

    /**
     * Extrait JSON du contenu avec multiples patterns
     */
    private extractJsonFromContent(content: string): any {
        const patterns = [
            /\{[\s\S]*?"sentiment"[\s\S]*?\}/g,  // Standard JSON
            /\{[\s\S]*?\}/g,                       // N'importe quel objet JSON
            /sentiment["\s]*:\s*"[^"]+"/,           // Format clé-valeur
            /sentiment["\s]*:\s*[^,}]+/m            // Format clé-valeur (non-quoté)
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                try {
                    return JSON.parse(match[0]);
                } catch (e) {
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * Valide et normalise le résultat pour le SentimentAgent
     */
    private validateSentimentResult(result: any): any {
        if (!result || typeof result !== 'object') {
            return this.createValidatedResult();
        }

        return this.createValidatedResult({
            sentiment: result.sentiment,
            score: result.score,
            risk_level: result.risk_level,
            catalysts: result.catalysts,
            summary: result.summary
        });
    }

    /**
     * Crée un résultat validé
     */
    private createValidatedResult(override: any = {}): any {
        return {
            sentiment: override.sentiment && ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(override.sentiment.toUpperCase())
                ? override.sentiment.toUpperCase()
                : 'NEUTRAL',
            score: typeof override.score === 'number' && override.score >= -100 && override.score <= 100
                ? override.score
                : 0,
            risk_level: override.risk_level && ['LOW', 'MEDIUM', 'HIGH'].includes(override.risk_level.toUpperCase())
                ? override.risk_level.toUpperCase()
                : 'MEDIUM',
            catalysts: Array.isArray(override.catalysts)
                ? override.catalysts.filter((c: any) => typeof c === 'string').slice(0, 5)
                : [],
            summary: typeof override.summary === 'string'
                ? override.summary
                : 'No analysis available'
        };
    }

    /**
     * Analyse basée sur les patterns quand KiloCode échoue complètement
     */
    private performPatternBasedAnalysis(newsItems: NewsItem[]): any {
        console.log(`[${this.agentName}] Performing pattern-based analysis fallback...`);

        // Compter les mots-clés positifs et négatifs
        let bullishCount = 0;
        let bearishCount = 0;
        let neutralCount = 0;
        const catalysts: string[] = [];

        const bullishKeywords = ['rally', 'bullish', 'gains', 'positive', 'growth', 'rises', 'jumps', 'surges', 'recovery'];
        const bearishKeywords = ['fall', 'decline', 'bearish', 'drop', 'crash', 'slump', 'plunge', 'declines', 'losses', 'negative'];
        const neutralKeywords = ['stable', 'flat', 'mixed', 'uncertain', 'caution', 'wait', 'holds', 'steady'];

        newsItems.forEach(item => {
            const title = item.title.toLowerCase();

            if (bullishKeywords.some(k => title.includes(k))) {
                bullishCount++;
            } else if (bearishKeywords.some(k => title.includes(k))) {
                bearishCount++;
            } else if (neutralKeywords.some(k => title.includes(k))) {
                neutralCount++;
            }

            // Extraire les catalysts évidents
            if (title.includes('fed') && (title.includes('rate') || title.includes('cut'))) {
                catalysts.push('Fed Rate Policy');
            }
            if (title.includes('bitcoin') || title.includes('crypto')) {
                catalysts.push('Cryptocurrency');
            }
            if (title.includes('ai') && (title.includes('spending') || title.includes('investment'))) {
                catalysts.push('AI Market Activity');
            }
        });

        // Déterminer le sentiment basé sur les comptes
        let sentiment = 'NEUTRAL';
        let score = 0;

        if (bullishCount > bearishCount && bullishCount > neutralCount) {
            sentiment = 'BULLISH';
            score = Math.min(50, (bullishCount / newsItems.length) * 100);
        } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
            sentiment = 'BEARISH';
            score = Math.max(-50, -(bearishCount / newsItems.length) * 100);
        } else {
            sentiment = 'NEUTRAL';
            score = 0;
        }

        // Déterminer le risque basé sur la volatilité
        const volatility = (bullishCount + bearishCount) / newsItems.length;
        let riskLevel = 'MEDIUM';
        if (volatility > 0.7) riskLevel = 'HIGH';
        else if (volatility < 0.3) riskLevel = 'LOW';

        return this.createValidatedResult({
            sentiment,
            score,
            risk_level: riskLevel,
            catalysts: [...new Set(catalysts)].slice(0, 5),
            summary: `Pattern-based analysis: ${bullishCount} bullish, ${bearishCount} bearish, ${neutralCount} neutral headlines analyzed. Sentiment determined as ${sentiment} with ${Math.abs(score)} confidence score.`
        });
    }
}