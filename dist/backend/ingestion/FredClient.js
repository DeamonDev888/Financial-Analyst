"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FredClient = void 0;
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
// Schéma de validation pour les données FRED (Séries Temporelles)
const FredSeriesSchema = zod_1.z.object({
    realtime_start: zod_1.z.string(),
    realtime_end: zod_1.z.string(),
    observation_start: zod_1.z.string(),
    observation_end: zod_1.z.string(),
    units: zod_1.z.string(),
    output_type: zod_1.z.string(),
    file_type: zod_1.z.string(),
    order_by: zod_1.z.string(),
    sort_order: zod_1.z.string(),
    count: zod_1.z.number(),
    offset: zod_1.z.number(),
    limit: zod_1.z.number(),
    observations: zod_1.z.array(zod_1.z.object({
        realtime_start: zod_1.z.string(),
        realtime_end: zod_1.z.string(),
        date: zod_1.z.string(),
        value: zod_1.z.string()
    }))
});
class FredClient {
    client;
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = axios_1.default.create({
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
    async getSeriesObservations(seriesId) {
        try {
            const response = await this.client.get('/observations', {
                params: { series_id: seriesId }
            });
            // Validation des données entrantes (Crucial pour la finance)
            const parsed = FredSeriesSchema.parse(response.data);
            return parsed.observations;
        }
        catch (error) {
            console.error(`Error fetching FRED series ${seriesId}:`, error);
            throw error;
        }
    }
}
exports.FredClient = FredClient;
