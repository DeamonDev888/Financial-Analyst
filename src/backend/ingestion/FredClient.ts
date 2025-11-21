import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Schéma de validation pour les données FRED (Séries Temporelles)
const FredSeriesSchema = z.object({
    realtime_start: z.string(),
    realtime_end: z.string(),
    observation_start: z.string(),
    observation_end: z.string(),
    units: z.string(),
    output_type: z.string(),
    file_type: z.string(),
    order_by: z.string(),
    sort_order: z.string(),
    count: z.number(),
    offset: z.number(),
    limit: z.number(),
    observations: z.array(z.object({
        realtime_start: z.string(),
        realtime_end: z.string(),
        date: z.string(),
        value: z.string()
    }))
});

export class FredClient {
    private client: AxiosInstance;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: 'https://api.stlouisfed.org/fred/series',
            params: {
                api_key: this.apiKey,
                file_type: 'json'
            }
        });
    }

    /**
     * Récupère une série économique spécifique (ex: GDP, CPIAUCSL)
     * @param seriesId ID de la série FRED
     */
    async getSeriesObservations(seriesId: string) {
        try {
            const response = await this.client.get('/observations', {
                params: { series_id: seriesId }
            });

            // Validation des données entrantes (Crucial pour la finance)
            const parsed = FredSeriesSchema.parse(response.data);
            return parsed.observations;
        } catch (error) {
            console.error(`Error fetching FRED series ${seriesId}:`, error);
            throw error;
        }
    }
}
