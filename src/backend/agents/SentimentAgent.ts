import { BaseAgent } from './BaseAgent';
import { NewsAggregator, NewsItem } from '../ingestion/NewsAggregator';
import { ToonFormatter } from '../utils/ToonFormatter';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SentimentAgent extends BaseAgent {
    private newsAggregator: NewsAggregator;

    constructor() {
        super('sentiment-agent');
        this.newsAggregator = new NewsAggregator();
    }

    /**
     * Exécute le cycle complet d'analyse de sentiment :
     * 1. Scraping des sources (ZeroHedge, ZoneBourse, FinancialJuice)
     * 2. Formatage TOON
     * 3. Analyse AI via KiloCode
     */
    async analyzeMarketSentiment(): Promise<any> {
        console.log(`[${this.agentName}] Starting scraping cycle...`);

        // 1. Agrégation parallèle des données
        const [zeroHedge, cnbc, financialJuice] = await Promise.all([
            this.newsAggregator.fetchZeroHedgeHeadlines(),
            this.newsAggregator.fetchCNBCMarketNews(),
            this.newsAggregator.fetchFinancialJuice()
        ]);

        const allNews = [...zeroHedge, ...cnbc, ...financialJuice];
        console.log(`[${this.agentName}] Scraped ${allNews.length} headlines (ZH: ${zeroHedge.length}, CNBC: ${cnbc.length}, FJ: ${financialJuice.length})`);

        if (allNews.length === 0) {
            return { sentiment: 'NEUTRAL', confidence: 0, summary: 'No news data available.' };
        }

        // 2. Conversion en format TOON
        const toonData = ToonFormatter.arrayToToon('headlines', allNews.map(n => ({
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

        // Assurer que le dossier existe (BaseAgent le fait dans le constructeur mais on écrit direct ici)
        await fs.mkdir(path.dirname(fullContextPath), { recursive: true });
        await fs.writeFile(fullContextPath, toonData, 'utf-8');

        // 4. Construction du Prompt (Instructions seulement, Données via Pipe)
        const prompt = `
You are an expert Market Sentiment Analyst for ES Futures (S&P 500).
The user has provided news headlines in TOON format via standard input.

TASK:
Analyze the provided TOON data and return the result in strict JSON format.

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
`;

        // 5. Appel à KiloCode (x-ai)
        // On passe le fichier de contexte en entrée (pipe)
        const analysis = await this.callKiloCode({
            prompt: prompt,
            inputFile: contextFilePath,
            outputFile: `data/agent-data/${this.agentName}/sentiment_analysis.json`
        });

        return analysis;
    }
}
