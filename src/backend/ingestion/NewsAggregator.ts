import axios from 'axios';
import * as cheerio from 'cheerio';
import { FredClient } from './FredClient';

export interface NewsItem {
    title: string;
    source: string;
    url: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    timestamp: Date;
}

export class NewsAggregator {
    private fredClient: FredClient;

    constructor() {
        this.fredClient = new FredClient();
    }

    /**
     * Récupère les news via RSS pour ZeroHedge (Beaucoup plus fiable que le scraping HTML)
     */
    async fetchZeroHedgeHeadlines(): Promise<NewsItem[]> {
        try {
            // Flux RSS officiel de ZeroHedge
            const { data } = await axios.get('http://feeds.feedburner.com/zerohedge/feed', {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NovaQuoteAgent/1.0)' },
                timeout: 5000
            });

            const $ = cheerio.load(data, { xmlMode: true });
            const news: NewsItem[] = [];

            $('item').each((_, el) => {
                const title = $(el).find('title').text().trim();
                const link = $(el).find('link').text().trim();
                const pubDate = $(el).find('pubDate').text();

                if (title && link) {
                    news.push({
                        title,
                        source: 'ZeroHedge',
                        url: link,
                        timestamp: new Date(pubDate)
                    });
                }
            });

            return news.slice(0, 10); // Top 10 news
        } catch (error) {
            console.error('Error fetching ZeroHedge RSS:', error instanceof Error ? error.message : error);
            return [];
        }
    }

    /**
     * Récupère les news de CNBC (US Markets) via RSS
     * Plus pertinent pour le S&P 500 (ES Futures) que ZoneBourse.
     */
    async fetchCNBCMarketNews(): Promise<NewsItem[]> {
        try {
            // Flux RSS CNBC Finance
            const { data } = await axios.get('https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NovaQuoteAgent/1.0)' },
                timeout: 5000
            });

            const $ = cheerio.load(data, { xmlMode: true });
            const news: NewsItem[] = [];

            $('item').each((_, el) => {
                const title = $(el).find('title').text().trim();
                const link = $(el).find('link').text().trim();
                const pubDate = $(el).find('pubDate').text();

                if (title && link) {
                    news.push({
                        title,
                        source: 'CNBC',
                        url: link,
                        timestamp: new Date(pubDate)
                    });
                }
            });
            return news.slice(0, 10);
        } catch (error) {
            console.error('Error fetching CNBC RSS:', error instanceof Error ? error.message : error);
            return [];
        }
    }

    /**
     * Simulation FinancialJuice (Car SPA complexe nécessitant Puppeteer)
     * Pour la démo, on retourne des données statiques réalistes.
     */
    async fetchFinancialJuice(): Promise<NewsItem[]> {
        return [
            {
                title: "S&P 500 Futures extend gains as bond yields retreat",
                source: "FinancialJuice",
                url: "https://financialjuice.com",
                timestamp: new Date()
            },
            {
                title: "Fed's Powell: 'Inflation is moving down but slowly'",
                source: "FinancialJuice",
                url: "https://financialjuice.com",
                timestamp: new Date()
            }
        ];
    }

    /**
     * Récupère les indicateurs économiques via FRED
     */
    async fetchFredEconomicData(): Promise<NewsItem[]> {
        try {
            const indicators = await this.fredClient.fetchAllKeyIndicators();
            
            return indicators.map(ind => ({
                title: `[MACRO DATA] ${ind.title}: ${ind.value} (As of ${ind.date})`,
                source: 'FRED',
                // URL unique par date pour éviter la déduplication abusive si la valeur change
                url: `https://fred.stlouisfed.org/series/${ind.id}?date=${ind.date}`,
                timestamp: new Date(ind.date),
                sentiment: 'neutral' // Le sentiment sera analysé par l'IA
            }));
        } catch (error) {
            console.error('Error fetching FRED data:', error);
            return [];
        }
    }

    /**
     * Placeholder pour TradingEconomics
     */
    async fetchTradingEconomicsCalendar(): Promise<any[]> {
        return [];
    }
}
