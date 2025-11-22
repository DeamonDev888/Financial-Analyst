"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FmpClient = void 0;
const axios_1 = __importDefault(require("axios"));
class FmpClient {
    client;
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = axios_1.default.create({
            baseURL: 'https://financialmodelingprep.com/api/v3',
            params: { apikey: this.apiKey }
        });
    }
    /**
     * Récupère les rendements du Trésor (Treasury Yields) pour analyser la courbe des taux.
     * C'est un indicateur clé de récession ou d'expansion.
     */
    async getTreasuryRates() {
        try {
            // Endpoint FMP pour les taux (vérifier la doc exacte, souvent sous /treasury)
            // Ici on utilise une route générique pour l'exemple
            const response = await this.client.get('/treasury');
            return response.data;
        }
        catch (error) {
            console.error('Error fetching Treasury Rates:', error);
            return null;
        }
    }
    /**
     * Récupère le calendrier des résultats (Earnings Calendar)
     * @param from Date de début (YYYY-MM-DD)
     * @param to Date de fin (YYYY-MM-DD)
     */
    async getEarningsCalendar(from, to) {
        try {
            const response = await this.client.get('/earning_calendar', {
                params: { from, to }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error fetching Earnings Calendar:', error);
            return [];
        }
    }
}
exports.FmpClient = FmpClient;
