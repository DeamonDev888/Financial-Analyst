import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface FredSeriesData {
    id: string;
    title: string;
    value: number;
    date: string;
    unit?: string;
}

export class FredClient {
    private apiKey: string;
    private baseUrl = 'https://api.stlouisfed.org/fred/series/observations';

    // Mapping des séries importantes
    private seriesMap = {
        'CPIAUCSL': 'US CPI (Inflation)',
        'UNRATE': 'US Unemployment Rate',
        'FEDFUNDS': 'Federal Funds Rate',
        'GDP': 'US GDP',
        'DGS10': '10-Year Treasury Yield',
        'VIXCLS': 'CBOE Volatility Index (VIX)',
        'T10Y2Y': '10Y-2Y Treasury Yield Spread',
        'WALCL': 'Fed Balance Sheet (Liquidity)',
        'BAMLH0A0HYM2': 'High Yield Credit Spread'
    };

    constructor() {
        this.apiKey = process.env.FRED_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ FRED_API_KEY is missing in .env file. FRED data will not be fetched.');
        }
    }

    /**
     * Récupère les dernières données pour une série spécifique
     */
    async fetchSeriesObservation(seriesId: string): Promise<FredSeriesData | null> {
        if (!this.apiKey) return null;

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    series_id: seriesId,
                    api_key: this.apiKey,
                    file_type: 'json',
                    limit: 1,
                    sort_order: 'desc'
                }
            });

            const observations = response.data.observations;
            if (observations && observations.length > 0) {
                const obs = observations[0];
                return {
                    id: seriesId,
                    title: this.seriesMap[seriesId as keyof typeof this.seriesMap] || seriesId,
                    value: parseFloat(obs.value),
                    date: obs.date
                };
            }
            return null;
        } catch (error) {
            console.error(`❌ Error fetching FRED series ${seriesId}:`, error instanceof Error ? error.message : error);
            return null;
        }
    }

    /**
     * Récupère toutes les séries configurées
     */
    async fetchAllKeyIndicators(): Promise<FredSeriesData[]> {
        if (!this.apiKey) return [];

        const seriesIds = Object.keys(this.seriesMap);
        const promises = seriesIds.map(id => this.fetchSeriesObservation(id));
        
        const results = await Promise.all(promises);
        return results.filter((item): item is FredSeriesData => item !== null);
    }
}
