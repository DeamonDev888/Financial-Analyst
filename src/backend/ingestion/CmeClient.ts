import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CmeData {
    title: string;
    value: string;
    date: string;
    source: 'CME_FEDWATCH' | 'CME_VIX';
    raw?: string;
}

export class CmeClient {
    
    /**
     * Récupère les probabilités de taux via Investing.com Fed Rate Monitor Tool.
     * Source alternative robuste car CME est bloqué.
     */
    async fetchFedWatchProbabilities(): Promise<CmeData[]> {
        const { chromium } = require('playwright');
        let browser;

        try {
            console.log('   🔄 Launching Playwright for Investing.com Fed Monitor...');
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            // URL de l'outil Investing.com
            const url = 'https://www.investing.com/central-banks/fed/rate-monitor';
            
            console.log('   🌍 Navigating to Investing.com...');
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            console.log('   ⏳ Waiting for dynamic content...');
            await page.waitForTimeout(5000);

            // Gestion des popups potentiels (Consentement cookies, etc.)
            try {
                const closeButton = await page.$('#onetrust-accept-btn-handler');
                if (closeButton) await closeButton.click();
            } catch (e) { /* Ignore */ }

            // Debug: Capture du titre
            const pageTitle = await page.title();
            console.log(`   📄 Page Title: ${pageTitle}`);

            // Tentative d'extraction plus large
            const fedData = await page.evaluate(() => {
                // On cherche des conteneurs qui pourraient contenir les données
                // Investing utilise souvent des IDs comme 'fedRateMonitor' ou des classes spécifiques
                const mainContainer = document.querySelector('#fedRateMonitor') || document.body;
                const textContent = (mainContainer as HTMLElement).innerText;

                // On cherche des motifs de dates futures (ex: "Dec 18, 2024")
                // et des pourcentages associés
                
                // Si on trouve le texte "Fed Rate Monitor Tool", on considère que la page est chargée
                if (textContent.includes("Fed Rate Monitor Tool") || document.title.includes("Fed Rate Monitor")) {
                    return [{
                        title: document.title,
                        // On capture les 1000 premiers caractères pertinents pour l'IA
                        raw: textContent.substring(0, 1000).replace(/\s+/g, ' ').trim()
                    }];
                }
                return [];
            });
            
            if (fedData.length > 0) {
                 return [{
                    title: `[FED RATE MONITOR] ${fedData[0].title}`,
                    value: "See Raw Data",
                    date: new Date().toISOString(),
                    source: 'CME_FEDWATCH',
                    raw: fedData[0].raw
                }];
            } else {
                console.warn('   ⚠️ No specific Fed Monitor data found in page content.');
                // Fallback: on renvoie quand même le titre pour dire qu'on a essayé
                return [{
                    title: `[FED RATE MONITOR] Access Successful - Parsing Pending`,
                    value: "Check URL manually",
                    date: new Date().toISOString(),
                    source: 'CME_FEDWATCH',
                    raw: `Page Title: ${pageTitle}. Content parsing needs adjustment.`
                }];
            }

            return [];

        } catch (error) {
            console.error('❌ Investing.com Scraping Error:', error instanceof Error ? error.message : error);
            return [];
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {
                    console.error('Error closing browser:', e);
                }
            }
        }
    }

    /**
     * Récupère les données VIX via Yahoo Finance API (plus fiable que le scraping HTML)
     * [SUPPRIMÉ PAR L'UTILISATEUR] - Le VIX sera récupéré ailleurs.
     */
    /*
    async fetchVixInsights(): Promise<CmeData | null> {
        // ... Code removed ...
        return null;
    }
    */
}
