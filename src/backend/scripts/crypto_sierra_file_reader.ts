import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface CryptoData {
    symbol: string;
    lastPrice: number;
    timestamp: Date;
    change: number;
    changePercent: number;
    volume: number;
    source: string;
    exchange?: string;
}

export class CryptoFileReader extends EventEmitter {
    private sierraDataPath: string;
    private watchInterval: NodeJS.Timeout | null = null;
    private lastPrices: Map<string, number> = new Map();

    constructor(dataPath: string = 'C:/SierraChart/Data/') {
        super();
        this.sierraDataPath = dataPath;
    }

    /**
     * Liste les symboles crypto disponibles dans les fichiers Sierra Chart
     */
    getAvailableCryptoSymbols(): string[] {
        try {
            const files = fs.readdirSync(this.sierraDataPath);
            const cryptoSymbols = new Set<string>();

            files.forEach(file => {
                const ext = path.extname(file);
                const base = path.basename(file, ext);

                // Symboles crypto intéressants
                const cryptoKeywords = [
                    'BTC', 'ETH', 'XBT', 'DOGE', 'SOL', 'BNB', 'USDT',
                    'BITMEX', 'BINANCE', 'PERP'
                ];

                if (['.scid', '.dly'].includes(ext) &&
                    cryptoKeywords.some(keyword => base.toUpperCase().includes(keyword))) {
                    cryptoSymbols.add(base);
                }
            });

            return Array.from(cryptoSymbols).sort();
        } catch (error) {
            console.error('❌ Erreur lecture dossier:', error);
            return [];
        }
    }

    /**
     * Tente de lire le prix actuel d'un symbole crypto
     */
    async getCryptoPrice(symbol: string): Promise<CryptoData | null> {
        try {
            // Essayer les fichiers intraday (.scid) d'abord
            const scidFile = path.join(this.sierraDataPath, `${symbol}.scid`);
            const dlyFile = path.join(this.sierraDataPath, `${symbol}.dly`);

            if (fs.existsSync(scidFile)) {
                const data = await this.readSCIDFile(scidFile, symbol);
                if (data) return data;
            }

            if (fs.existsSync(dlyFile)) {
                const data = await this.readDLYFile(dlyFile, symbol);
                if (data) return data;
            }

            return null;
        } catch (error) {
            console.error(`❌ Erreur lecture ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Lit tous les symboles crypto disponibles
     */
    async getAllCryptoPrices(): Promise<CryptoData[]> {
        const symbols = this.getAvailableCryptoSymbols();
        const results: CryptoData[] = [];

        for (const symbol of symbols) {
            const data = await this.getCryptoPrice(symbol);
            if (data) {
                results.push(data);
            }
        }

        return results;
    }

    /**
     * Lit un fichier SCID (intraday)
     */
    private async readSCIDFile(filePath: string, symbol: string): Promise<CryptoData | null> {
        try {
            const buffer = fs.readFileSync(filePath);

            // Vérifier l'en-tête SCID
            if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== 'SCID') {
                return null;
            }

            // Extraire le prix depuis le buffer
            const lastPrice = this.extractCryptoPrice(buffer, symbol);
            const exchange = this.extractExchange(symbol);

            if (lastPrice > 0) {
                const prevPrice = this.lastPrices.get(symbol) || lastPrice;
                const change = lastPrice - prevPrice;
                const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

                this.lastPrices.set(symbol, lastPrice);

                return {
                    symbol: symbol,
                    lastPrice: lastPrice,
                    timestamp: new Date(),
                    change: change,
                    changePercent: changePercent,
                    volume: 0,
                    source: 'SierraChart Intraday',
                    exchange: exchange
                };
            }

            return null;
        } catch (error) {
            console.error(`❌ Erreur lecture ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Lit un fichier DLY (daily)
     */
    private async readDLYFile(filePath: string, symbol: string): Promise<CryptoData | null> {
        try {
            const buffer = fs.readFileSync(filePath);
            const lastPrice = this.extractCryptoPrice(buffer, symbol);
            const exchange = this.extractExchange(symbol);

            if (lastPrice > 0) {
                const prevPrice = this.lastPrices.get(symbol) || lastPrice;
                const change = lastPrice - prevPrice;
                const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

                this.lastPrices.set(symbol, lastPrice);

                return {
                    symbol: symbol,
                    lastPrice: lastPrice,
                    timestamp: new Date(),
                    change: change,
                    changePercent: changePercent,
                    volume: 0,
                    source: 'SierraChart Daily',
                    exchange: exchange
                };
            }

            return null;
        } catch (error) {
            console.error(`❌ Erreur lecture ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Extrait le prix d'un crypto depuis un buffer
     */
    private extractCryptoPrice(buffer: Buffer, symbol: string): number {
        let maxPrice = 0;

        // Déterminer la plage de prix selon le symbole
        let minPrice = 0, maxExpectedPrice = 100000;

        if (symbol.includes('BTC') || symbol.includes('XBT')) {
            minPrice = 20000;
            maxExpectedPrice = 200000;
        } else if (symbol.includes('ETH')) {
            minPrice = 1000;
            maxExpectedPrice = 10000;
        } else if (symbol.includes('DOGE')) {
            minPrice = 0.0001;
            maxExpectedPrice = 10;
        } else if (symbol.includes('SOL')) {
            minPrice = 10;
            maxExpectedPrice = 1000;
        } else if (symbol.includes('BNB')) {
            minPrice = 100;
            maxExpectedPrice = 10000;
        }

        // Chercher dans les 2000 derniers octets pour des valeurs de prix plausibles
        const searchBuffer = buffer.slice(Math.max(0, buffer.length - 2000));

        for (let i = 0; i < searchBuffer.length - 8; i += 4) {
            // Essayer de lire un float (32 bits)
            const value = searchBuffer.readFloatLE(i);

            // Vérifier si le prix est dans la plage attendue
            if (value >= minPrice && value <= maxExpectedPrice &&
                !isNaN(value) && isFinite(value)) {
                maxPrice = Math.max(maxPrice, value);
            }

            // Pour les crypto à faible valeur (comme DOGE), aussi vérifier les double
            if (i + 8 <= searchBuffer.length - 8) {
                const doubleValue = searchBuffer.readDoubleLE(i);
                if (doubleValue >= minPrice && doubleValue <= maxExpectedPrice &&
                    !isNaN(doubleValue) && isFinite(doubleValue)) {
                    maxPrice = Math.max(maxPrice, doubleValue);
                }
            }
        }

        return maxPrice;
    }

    /**
     * Extrait l'exchange depuis le symbole
     */
    private extractExchange(symbol: string): string {
        if (symbol.includes('BITMEX') || symbol.includes('BMEX')) {
            return 'BitMEX';
        } else if (symbol.includes('BINANCE')) {
            return 'Binance';
        }
        return 'Unknown';
    }

    /**
     * Démarre la surveillance continue des crypto-monnaies
     */
    startWatching(intervalMs: number = 2000): void {
        console.log(`🚀 Démarrage surveillance crypto depuis: ${this.sierraDataPath}`);

        // Vérification immédiate
        this.checkAndEmitCrypto();

        // Surveillance périodique
        this.watchInterval = setInterval(() => {
            this.checkAndEmitCrypto();
        }, intervalMs);
    }

    /**
     * Arrête la surveillance
     */
    stopWatching(): void {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
            console.log('🔌 Surveillance crypto arrêtée');
        }
    }

    /**
     * Vérifie et émet les données crypto
     */
    private async checkAndEmitCrypto(): Promise<void> {
        try {
            const cryptoData = await this.getAllCryptoPrices();

            if (cryptoData.length > 0) {
                console.log(`\n🪙 Données Crypto (${cryptoData.length} symboles):`);
                console.log('   ' + '='.repeat(80));

                cryptoData.forEach(data => {
                    const emoji = this.getCryptoEmoji(data.symbol);
                    console.log(`${emoji} ${data.symbol} (${data.exchange}): ${data.lastPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8})} ${data.changePercent >= 0 ? '📈' : '📉'} ${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`);
                    console.log(`   ⏰ ${data.timestamp.toLocaleString()}`);
                    console.log(`   📊 Source: ${data.source}`);
                    console.log('   ' + '-'.repeat(50));
                });

                cryptoData.forEach(data => this.emit('cryptoData', data));
            } else {
                // Premier échec : donner des instructions
                if (this.lastPrices.size === 0) {
                    console.log('⚠️ Configuration requise:');
                    console.log('   1. Ouvrez Sierra Chart');
                    console.log('   2. File > New/Open Chart');
                    console.log('   3. Symbol: XBTUSD-BMEX (ou BTCUSDT_PERP_BINANCE)');
                    console.log('   4. Exchange: BitMEX (ou Binance)');
                    console.log('   5. Cliquez sur OK pour ajouter le symbole');
                    console.log('   6. Attendez quelques minutes que les données se chargent');
                }
            }
        } catch (error) {
            console.error('❌ Erreur surveillance crypto:', error);
        }
    }

    /**
     * Obtenir l'emoji approprié pour chaque crypto
     */
    private getCryptoEmoji(symbol: string): string {
        if (symbol.includes('BTC') || symbol.includes('XBT')) return '🟠';
        if (symbol.includes('ETH')) return '🔷';
        if (symbol.includes('DOGE')) return '🐕';
        if (symbol.includes('SOL')) return '🟣';
        if (symbol.includes('BNB')) return '🟡';
        if (symbol.includes('USDT')) return '💵';
        return '🪙';
    }

    /**
     * Vérifie l'état des fichiers
     */
    checkFilesStatus(): void {
        const symbols = this.getAvailableCryptoSymbols();
        console.log('\n📋 Vérification fichiers crypto:');
        console.log(`   Chemin: ${this.sierraDataPath}`);
        console.log(`   Symboles crypto trouvés: ${symbols.length}`);

        if (symbols.length > 0) {
            console.log('   Symboles:');
            symbols.forEach(symbol => {
                const scidExists = fs.existsSync(path.join(this.sierraDataPath, `${symbol}.scid`));
                const dlyExists = fs.existsSync(path.join(this.sierraDataPath, `${symbol}.dly`));
                console.log(`     ${symbol}: .scid ${scidExists ? '✅' : '❌'} .dly ${dlyExists ? '✅' : '❌'}`);
            });
        } else {
            console.log('   ❌ Aucun fichier crypto trouvé');
        }
    }

    /**
     * Statistiques du lecteur
     */
    getStats(): any {
        return {
            dataPath: this.sierraDataPath,
            availableSymbols: this.getAvailableCryptoSymbols(),
            lastPricesCount: this.lastPrices.size,
            isWatching: this.watchInterval !== null
        };
    }
}

async function main() {
    const cryptoReader = new CryptoFileReader();

    cryptoReader.on('cryptoData', (data: CryptoData) => {
        // Info déjà affichée
    });

    try {
        // Afficher le statut des fichiers
        cryptoReader.checkFilesStatus();

        console.log('\n🚀 Démarrage lecture crypto depuis fichiers Sierra Chart...');

        // Démarrer la surveillance
        cryptoReader.startWatching(2000); // Vérifier toutes les 2 secondes

        // Test après 15 secondes
        setTimeout(async () => {
            console.log('\n🎯 Test lecture crypto...');
            const cryptoPrices = await cryptoReader.getAllCryptoPrices();
            const stats = cryptoReader.getStats();

            console.log(`💰 Résultats Crypto:
   Symboles trouvés: ${stats.availableSymbols.length}
   Prix récupérés: ${cryptoPrices.length}
   Symboles disponibles: ${stats.availableSymbols.join(', ')}`);
        }, 15000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt lecture crypto...');
            cryptoReader.stopWatching();
            process.exit(0);
        });

        console.log('🪙 Surveillance crypto active. Attente des données...\n');

    } catch (error) {
        console.error('❌ Erreur fatale crypto:', error);
        process.exit(1);
    }
}

export default CryptoFileReader;

if (require.main === module) {
    main();
}