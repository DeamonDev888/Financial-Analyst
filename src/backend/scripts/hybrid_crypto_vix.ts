import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface MarketData {
    symbol: string;
    source: 'SierraChart' | 'BinanceAPI' | 'BitMEXAPI';
    price: number;
    changePercent: number;
    volume: number;
    timestamp: Date;
    bid?: number;
    ask?: number;
}

export class HybridMarketData extends EventEmitter {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private apiInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
    }

    async connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🚀 Connexion hybride - Sierra Chart + API Crypto');

                // 1. Connexion Sierra Chart
                await this.connectSierraChart();

                // 2. Démarrer API Crypto immédiatement
                this.startCryptoAPI();

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    private async connectSierraChart(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔌 Connexion Sierra Chart sur ws://localhost:11099');
                this.ws = new WebSocket('ws://localhost:11099');

                this.ws.on('open', () => {
                    console.log('✅ WebSocket Sierra Chart connecté');
                    this.isConnected = true;
                    this.authenticateSierraChart();
                    resolve();
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleSierraChartMessage(data);
                });

                this.ws.on('error', (error: Error) => {
                    console.error('❌ Erreur WebSocket Sierra:', error.message);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('🔌 WebSocket Sierra Chart fermé');
                    this.isConnected = false;
                    this.isAuthenticated = false;
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private authenticateSierraChart(): void {
        const authMessage = {
            Type: 1,
            Username: 'DEMO',
            Password: 'DEMO',
            ProtocolVersion: 8
        };

        this.sendMessageSierraChart(authMessage);
        console.log('🔐 Authentification Sierra Chart envoyée');
    }

    private sendMessageSierraChart(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
    }

    private handleSierraChartMessage(data: Buffer): void {
        try {
            const messages = data.toString('utf8').split('\0').filter(msg => msg.trim());

            for (const msgStr of messages) {
                if (msgStr.trim()) {
                    const message = JSON.parse(msgStr);
                    this.processSierraChartMessage(message);
                }
            }
        } catch (error) {
            // Silencieux pour éviter le spam
        }
    }

    private processSierraChartMessage(message: any): void {
        switch (message.Type) {
            case 2:  // LOGON_RESPONSE
                if (message.Result === 1) {
                    console.log('✅ Sierra Chart authentifié');
                    this.isAuthenticated = true;
                    this.subscribeToVIX();
                }
                break;

            case 3001:  // MARKET_DATA
                this.handleMarketData(message);
                break;
        }
    }

    private subscribeToVIX(): void {
        console.log('📊 Souscription au VIX via Sierra Chart');

        this.sendMessageSierraChart({
            Type: 2002,  // SUBSCRIBE_TO_SYMBOL
            Symbol: 'VIX',
            RequestID: Date.now()
        });

        this.sendMessageSierraChart({
            Type: 2003,  // REQUEST_MARKET_DATA
            Symbol: 'VIX',
            RequestID: Date.now() + 1
        });
    }

    private handleMarketData(message: any): void {
        const symbol = message.Symbol || message.SymbolCode;
        if (!symbol) return;

        const price = parseFloat(message.LastPrice) || parseFloat(message.Price) || 0;

        if (price > 0) {
            const marketData: MarketData = {
                symbol: symbol,
                source: 'SierraChart',
                price: price,
                changePercent: parseFloat(message.ChangePercent) || 0,
                volume: parseInt(message.TotalVolume) || 0,
                timestamp: new Date(message.Timestamp || Date.now()),
                bid: parseFloat(message.Bid) || 0,
                ask: parseFloat(message.Ask) || 0
            };

            console.log(`📊 ${symbol} (Sierra): ${marketData.price.toLocaleString()} ${marketData.changePercent >= 0 ? '📈' : '📉'} ${marketData.changePercent.toFixed(2)}%`);
            this.emit('marketData', marketData);
        }
    }

    private startCryptoAPI(): void {
        console.log('🌐 Démarrage API Crypto (Binance + BitMEX)');

        // Actualisation toutes les 2 secondes
        this.apiInterval = setInterval(async () => {
            await this.fetchBinanceData();
            await this.fetchBitMEXData();
        }, 2000);

        // Première récupération immédiate
        setTimeout(async () => {
            await this.fetchBinanceData();
            await this.fetchBitMEXData();
        }, 1000);
    }

    private async fetchBinanceData(): Promise<void> {
        try {
            const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

            for (const symbol of symbols) {
                const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
                    timeout: 3000
                });

                const data = response.data;
                const marketData: MarketData = {
                    symbol: symbol,
                    source: 'BinanceAPI',
                    price: parseFloat(data.lastPrice),
                    changePercent: parseFloat(data.priceChangePercent),
                    volume: parseFloat(data.volume),
                    timestamp: new Date(),
                    bid: parseFloat(data.bidPrice),
                    ask: parseFloat(data.askPrice)
                };

                console.log(`🟡 ${symbol} (Binance): ${marketData.price.toLocaleString()} ${marketData.changePercent >= 0 ? '📈' : '📉'} ${marketData.changePercent.toFixed(2)}%`);
                this.emit('marketData', marketData);
            }
        } catch (error) {
            console.log('❌ Erreur API Binance:', (error as Error).message);
        }
    }

    private async fetchBitMEXData(): Promise<void> {
        try {
            const symbols = ['XBTUSD', 'ETHUSD'];

            for (const symbol of symbols) {
                const response = await axios.get(`https://www.bitmex.com/api/v1/instrument?symbol=${symbol}&count=1&reverse=false`, {
                    timeout: 3000
                });

                const data = response.data[0];
                if (data && data.lastPrice) {
                    const changePercent = ((data.lastPrice - data.prevClosePrice) / data.prevClosePrice) * 100;

                    const marketData: MarketData = {
                        symbol: symbol,
                        source: 'BitMEXAPI',
                        price: data.lastPrice,
                        changePercent: changePercent,
                        volume: data.volume24h || 0,
                        timestamp: new Date(data.timestamp),
                        bid: data.bidPrice,
                        ask: data.askPrice
                    };

                    console.log(`🔴 ${symbol} (BitMEX): ${marketData.price.toLocaleString()} ${marketData.changePercent >= 0 ? '📈' : '📉'} ${marketData.changePercent.toFixed(2)}%`);
                    this.emit('marketData', marketData);
                }
            }
        } catch (error) {
            console.log('❌ Erreur API BitMEX:', (error as Error).message);
        }
    }

    /**
     * Obtenir rapidement le prix d'un symbole
     */
    async getPrice(symbol: string): Promise<number | null> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected && !this.apiInterval) {
                reject(new Error('Pas connecté'));
                return;
            }

            const timeout = setTimeout(() => {
                this.removeListener('marketData', onData);
                resolve(null);
            }, 5000);

            const onData = (data: MarketData) => {
                if (data.symbol === symbol || data.symbol.includes(symbol)) {
                    clearTimeout(timeout);
                    this.removeListener('marketData', onData);
                    resolve(data.price);
                }
            };

            this.on('marketData', onData);
        });
    }

    disconnect(): void {
        if (this.apiInterval) {
            clearInterval(this.apiInterval);
            this.apiInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('🔌 Déconnexion hybride');
    }
}

async function main() {
    const hybrid = new HybridMarketData();

    hybrid.on('marketData', (data: MarketData) => {
        // Info déjà affichée
    });

    try {
        await hybrid.connect();

        // Test après 15 secondes
        setTimeout(async () => {
            console.log('\n🎯 Test récupération prix...');

            const btcPrice = await hybrid.getPrice('BTCUSDT');
            const ethPrice = await hybrid.getPrice('ETHUSDT');
            const vixPrice = await hybrid.getPrice('VIX');

            console.log(`💰 Résultats:
   BTCUSDT: ${btcPrice ? btcPrice.toLocaleString() : 'Non trouvé'}
   ETHUSDT: ${ethPrice ? ethPrice.toLocaleString() : 'Non trouvé'}
   VIX: ${vixPrice ? vixPrice.toLocaleString() : 'Non trouvé'}`);
        }, 15000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt...');
            hybrid.disconnect();
            process.exit(0);
        });

        console.log('🚀 Système hybride actif - Surveillance multi-sources !\n');

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

export default HybridMarketData;

if (require.main === module) {
    main();
}