import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface FinnhubNews {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
}

export class FinnhubClient {
    private apiKey: string;
    private baseUrl = 'https://finnhub.io/api/v1';

    constructor() {
        this.apiKey = process.env.FINNHUB_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ FINNHUB_API_KEY is missing. Finnhub data will not be fetched.');
        }
    }

    /**
     * Récupère les news générales du marché
     */
    async fetchMarketNews(): Promise<FinnhubNews[]> {
        if (!this.apiKey) return [];

        try {
            const response = await axios.get(`${this.baseUrl}/news`, {
                params: {
                    category: 'general',
                    token: this.apiKey
                },
                timeout: 5000
            });

            return response.data.slice(0, 10); // Top 10 news
        } catch (error) {
            console.error('❌ Error fetching Finnhub news:', error instanceof Error ? error.message : error);
            return [];
        }
    }

    /**
     * Récupère le sentiment des news (si disponible dans le plan gratuit)
     * Sinon, on se contente des news brutes
     */
    async fetchNewsSentiment(): Promise<any> {
        // Note: L'endpoint sentiment est souvent Premium.
        // On se concentre sur les news brutes pour l'instant.
        return null;
    }
}
