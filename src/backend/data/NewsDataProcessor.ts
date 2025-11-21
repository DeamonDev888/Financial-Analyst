import { NewsItem } from '../ingestion/NewsAggregator';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProcessedNewsData {
    date: string; // YYYY-MM-DD
    hour: string; // HH:00
    timestamp: Date;
    source: string;
    title: string;
    url: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    keywords: string[];
    market_hours: 'pre-market' | 'market' | 'after-hours' | 'extended';
}

export interface DailyNewsSummary {
    date: string;
    total_news: number;
    by_hour: Record<string, ProcessedNewsData[]>;
    by_source: Record<string, ProcessedNewsData[]>;
    sentiment_distribution: {
        bullish: number;
        bearish: number;
        neutral: number;
        unknown: number;
    };
    market_hours_distribution: {
        'pre-market': number;
        'market': number;
        'after-hours': number;
        'extended': number;
    };
    top_keywords: Array<{keyword: string, count: number}>;
}

export class NewsDataProcessor {
    private dataDir: string;
    private processedDataDir: string;

    constructor() {
        this.dataDir = path.join(process.cwd(), 'data');
        this.processedDataDir = path.join(this.dataDir, 'processed-news');
    }

    /**
     * Nettoie et traite les nouvelles brutes
     */
    async processNews(newsItems: NewsItem[]): Promise<ProcessedNewsData[]> {
        const processed: ProcessedNewsData[] = [];

        for (const item of newsItems) {
            const cleaned = await this.cleanAndClassify(item);
            if (cleaned) {
                processed.push(cleaned);
            }
        }

        return processed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Nettoie une nouvelle et la classe par jour/heure
     */
    private async cleanAndClassify(item: NewsItem): Promise<ProcessedNewsData | null> {
        try {
            // Nettoyage du titre
            const cleanedTitle = this.cleanTitle(item.title);
            if (!cleanedTitle || cleanedTitle.length < 10) {
                return null;
            }

            // Extraction des mots-clés
            const keywords = this.extractKeywords(cleanedTitle);

            // Détermination des heures de marché
            const timestamp = new Date(item.timestamp);
            const marketHours = this.determineMarketHours(timestamp);

            return {
                date: this.formatDate(timestamp),
                hour: this.formatHour(timestamp),
                timestamp,
                source: item.source,
                title: cleanedTitle,
                url: item.url,
                sentiment: item.sentiment,
                keywords,
                market_hours: marketHours
            };
        } catch (error) {
            console.error(`Error processing news item: ${item.title}`, error);
            return null;
        }
    }

    /**
     * Nettoie le titre du contenu superflu
     */
    private cleanTitle(title: string): string {
        return title
            .replace(/\s+/g, ' ') // Éviter les espaces multiples
            .replace(/[^\w\s\-.,!?():']/g, '') // Garder les caractères pertinents
            .replace(/^[–—\-\s]+|[–—\-\s]+$/g, '') // Éviter les tirets au début/fin
            .trim();
    }

    /**
     * Extrait les mots-clés pertinents pour le marché
     */
    private extractKeywords(title: string): string[] {
        const marketKeywords = [
            // Taux d'intérêt et politique monétaire
            'fed', 'federal reserve', 'powell', 'rate', 'rates', 'interest rate', 'inflation',
            'cpi', 'pce', 'monetary policy', 'dovish', 'hawkish', 'quantitative easing',

            // Indices et marchés
            's&p', 'sp500', 'nasdaq', 'dow', 'futures', 'es', 'nq', 'ym', 'russell',
            'volatility', 'vix', 'market', 'index', 'benchmark',

            // Secteurs et actions
            'tech', 'technology', 'bank', 'financials', 'energy', 'healthcare', 'consumer',
            'retail', 'automotive', 'semiconductor', 'chip', 'ai', 'artificial intelligence',

            // Économie et indicateurs
            'gdp', 'employment', 'unemployment', 'jobs', 'payrolls', 'manufacturing',
            'services', 'recession', 'growth', 'economy', 'economic',

            // Actions de marché
            'rally', 'sell-off', 'crash', 'bull', 'bear', 'bullish', 'bearish',
            'volatile', 'volatility', 'correction', 'dip', 'surge', 'plunge',

            // Entreprises spécifiques
            'apple', 'aapl', 'microsoft', 'msft', 'google', 'googl', 'amazon', 'amzn',
            'tesla', 'tsla', 'meta', 'nvidia', 'nvda', 'berkshire', 'jpmorgan',

            // Géopolitique et événements
            'china', 'europe', 'ukraine', 'russia', 'middle east', 'oil', 'commodities',
            'trade', 'tariff', 'sanction', 'election', 'government', 'shutdown'
        ];

        const titleLower = title.toLowerCase();
        const foundKeywords: string[] = [];

        marketKeywords.forEach(keyword => {
            if (titleLower.includes(keyword)) {
                foundKeywords.push(keyword);
            }
        });

        // Ajouter les mots capitaux du titre comme mots-clés additionnels
        const capitalizedWords = title
            .split(/\s+/)
            .filter(word => /^[A-Z][a-z]/.test(word) && word.length > 3)
            .slice(0, 3); // Limiter à 3 mots additionnels

        foundKeywords.push(...capitalizedWords);

        return [...new Set(foundKeywords)]; // Éviter les doublons
    }

    /**
     * Détermine si c'est en heures de marché US
     */
    private determineMarketHours(timestamp: Date): 'pre-market' | 'market' | 'after-hours' | 'extended' {
        const estTime = new Date(timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const hours = estTime.getHours();
        const day = estTime.getDay();

        // Week-end
        if (day === 0 || day === 6) {
            return 'extended';
        }

        // Pré-market: 4:00-9:30 EST
        if (hours >= 4 && hours < 9) {
            return 'pre-market';
        }

        // Market: 9:30-16:00 EST
        if (hours >= 9 && hours < 16) {
            return 'market';
        }

        // After-hours: 16:00-20:00 EST
        if (hours >= 16 && hours < 20) {
            return 'after-hours';
        }

        // Extended: le reste
        return 'extended';
    }

    /**
     * Formate la date en YYYY-MM-DD
     */
    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Formate l'heure en HH:00
     */
    private formatHour(date: Date): string {
        return `${date.getHours().toString().padStart(2, '0')}:00`;
    }

    /**
     * Sauvegarde les données traitées
     */
    async saveProcessedNews(data: ProcessedNewsData[]): Promise<void> {
        // Assurer que le répertoire existe
        await fs.mkdir(this.processedDataDir, { recursive: true });

        // Grouper par date
        const byDate = this.groupByDate(data);

        // Sauvegarder chaque jour dans un fichier séparé
        for (const [date, newsOfDate] of Object.entries(byDate)) {
            const fileName = `news_${date}.json`;
            const filePath = path.join(this.processedDataDir, fileName);

            const dailySummary = this.createDailySummary(date, newsOfDate);

            await fs.writeFile(filePath, JSON.stringify(dailySummary, null, 2), 'utf-8');
        }

        // Sauvegarder tout le jeu de données
        const allDataPath = path.join(this.processedDataDir, 'all_news.json');
        await fs.writeFile(allDataPath, JSON.stringify(data, null, 2), 'utf-8');

        console.log(`💾 Saved ${data.length} processed news items`);
    }

    /**
     * Regroupe les nouvelles par date
     */
    private groupByDate(data: ProcessedNewsData[]): Record<string, ProcessedNewsData[]> {
        return data.reduce((acc, item) => {
            if (!acc[item.date]) {
                acc[item.date] = [];
            }
            acc[item.date].push(item);
            return acc;
        }, {} as Record<string, ProcessedNewsData[]>);
    }

    /**
     * Crée un résumé journalier
     */
    private createDailySummary(date: string, newsOfDate: ProcessedNewsData[]): DailyNewsSummary {
        const byHour: Record<string, ProcessedNewsData[]> = {};
        const bySource: Record<string, ProcessedNewsData[]> = {};
        const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0, unknown: 0 };
        const marketHoursCounts = { 'pre-market': 0, 'market': 0, 'after-hours': 0, 'extended': 0 };
        const keywordCounts: Record<string, number> = {};

        newsOfDate.forEach(item => {
            // Grouper par heure
            if (!byHour[item.hour]) {
                byHour[item.hour] = [];
            }
            byHour[item.hour].push(item);

            // Grouper par source
            if (!bySource[item.source]) {
                bySource[item.source] = [];
            }
            bySource[item.source].push(item);

            // Compter les sentiments
            if (item.sentiment) {
                sentimentCounts[item.sentiment]++;
            } else {
                sentimentCounts.unknown++;
            }

            // Compter les heures de marché
            marketHoursCounts[item.market_hours]++;

            // Compter les mots-clés
            item.keywords.forEach(keyword => {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
        });

        // Top 10 mots-clés
        const topKeywords = Object.entries(keywordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));

        return {
            date,
            total_news: newsOfDate.length,
            by_hour: byHour,
            by_source: bySource,
            sentiment_distribution: sentimentCounts,
            market_hours_distribution: marketHoursCounts,
            top_keywords: topKeywords
        };
    }

    /**
     * Charge les données traitées pour une date spécifique
     */
    async loadDailyData(date: string): Promise<DailyNewsSummary | null> {
        try {
            const filePath = path.join(this.processedDataDir, `news_${date}.json`);
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading daily data for ${date}:`, error);
            return null;
        }
    }

    /**
     * Récupère les dates disponibles
     */
    async getAvailableDates(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.processedDataDir);
            return files
                .filter(file => file.startsWith('news_') && file.endsWith('.json') && file !== 'all_news.json')
                .map(file => file.replace('news_', '').replace('.json', ''))
                .sort()
                .reverse();
        } catch (error) {
            console.error('Error reading processed news directory:', error);
            return [];
        }
    }
}