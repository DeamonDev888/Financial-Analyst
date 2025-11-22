"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsAggregator = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
class NewsAggregator {
    /**
     * Récupère les news via RSS pour ZeroHedge (Beaucoup plus fiable que le scraping HTML)
     */
    async fetchZeroHedgeHeadlines() {
        try {
            // Flux RSS officiel de ZeroHedge
            const { data } = await axios_1.default.get('http://feeds.feedburner.com/zerohedge/feed', {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NovaQuoteAgent/1.0)' },
                timeout: 5000
            });
            const $ = cheerio.load(data, { xmlMode: true });
            const news = [];
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
        }
        catch (error) {
            console.error('Error fetching ZeroHedge RSS:', error instanceof Error ? error.message : error);
            return [];
        }
    }
    /**
     * Récupère les news de CNBC (US Markets) via RSS
     * Plus pertinent pour le S&P 500 (ES Futures) que ZoneBourse.
     */
    async fetchCNBCMarketNews() {
        try {
            // Flux RSS CNBC Finance
            const { data } = await axios_1.default.get('https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NovaQuoteAgent/1.0)' },
                timeout: 5000
            });
            const $ = cheerio.load(data, { xmlMode: true });
            const news = [];
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
        }
        catch (error) {
            console.error('Error fetching CNBC RSS:', error instanceof Error ? error.message : error);
            return [];
        }
    }
    /**
     * Simulation FinancialJuice (Car SPA complexe nécessitant Puppeteer)
     * Pour la démo, on retourne des données statiques réalistes.
     */
    async fetchFinancialJuice() {
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
     * Placeholder pour TradingEconomics
     */
    async fetchTradingEconomicsCalendar() {
        return [];
    }
}
exports.NewsAggregator = NewsAggregator;
