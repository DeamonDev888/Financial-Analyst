import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface CryptoData {
    symbol: string;
    source: string;
    lastPrice: number;
    bid: number;
    ask: number;
    volume: number;
    timestamp: Date;
    change: number;
    changePercent: number;
    high24h: number;
    low24h: number;
}

export class CryptoSierraChart extends EventEmitter {
    private ws: WebSocket | null = null;
    private host: string;
    private port: number;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private messageCount: number = 0;
    private cryptoData: Map<string, CryptoData> = new Map();

    constructor(host: string = 'localhost', port: number = 11099) {
        super();
        this.host = host;
        this.port = port;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔌 Connexion Crypto Sierra Chart sur ${this.host}:${this.port}`);
                this.ws = new WebSocket(`ws://${this.host}:${this.port}`);

                this.ws.on('open', () => {
                    console.log('✅ WebSocket Crypto connecté');
                    this.isConnected = true;
                    this.authenticate();
                    resolve();
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error: Error) => {
                    console.error('❌ Erreur WebSocket Crypto:', error.message);
                    this.emit('error', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('🔌 WebSocket Crypto fermé');
                    this.isConnected = false;
                    this.isAuthenticated = false;
                    this.emit('disconnected');
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private authenticate(): void {
        const authMessage = {
            Type: 1,
            Username: 'DEMO',
            Password: 'DEMO',
            ProtocolVersion: 8
        };

        this.sendMessage(authMessage);
        console.log('🔐 Authentification Crypto envoyée');
    }

    private sendMessage(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
        console.log(`📤 Message Crypto Type ${message.Type} envoyé`);
    }

    private handleMessage(data: Buffer): void {
        try {
            const messages = data.toString('utf8').split('\0').filter(msg => msg.trim());

            for (const msgStr of messages) {
                if (msgStr.trim()) {
                    this.messageCount++;
                    const message = JSON.parse(msgStr);
                    this.processCryptoMessage(message);
                }
            }
        } catch (error) {
            console.error('❌ Erreur traitement message Crypto:', error);
        }
    }

    private processCryptoMessage(message: any): void {
        switch (message.Type) {
            case 2:  // LOGON_RESPONSE
                if (message.Result === 1) {
                    console.log('✅ Crypto Sierra Chart authentifié');
                    this.isAuthenticated = true;
                    this.emit('authenticated');
                    setTimeout(() => this.subscribeToCrypto(), 1000);
                } else {
                    console.error('❌ Authentification Crypto échouée:', message.ResultText);
                    this.emit('authenticationError', message.ResultText);
                }
                break;

            case 3001:  // MARKET_DATA
                this.handleCryptoMarketData(message);
                break;

            case 11:   // MARKET_DATA_REJECT
                console.log(`❌ Crypto Symbol rejeté: ${message.Symbol} - ${message.RejectText}`);
                break;

            case 104:  // MARKET_DEPTH_UPDATE
                this.handleMarketDepth(message);
                break;

            case 3006:  // HISTORICAL_PRICE_DATA
                this.handleHistoricalData(message);
                break;

            case 3:    // HEARTBEAT
                // Silencieux
                break;

            default:
                if (this.messageCount <= 10) {
                    console.log(`📨 [${this.messageCount}] Crypto Message Type ${message.Type}:`, JSON.stringify(message).substring(0, 100));
                }
        }
    }

    private handleCryptoMarketData(message: any): void {
        const symbol = message.Symbol || message.SymbolCode;

        // Symboles crypto intéressants
        const cryptoSymbols = [
            'XBTUSD-BMEX', 'ETHUSD-BMEX', 'BTCUSD-BMEX',
            'XBTUSD', 'ETHUSD', 'BTCUSD',
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT',
            'BTC', 'ETH', 'DOGE', 'SOL'
        ];

        const isCryptoSymbol = cryptoSymbols.some(cryptoSymbol =>
            symbol && (symbol.includes(cryptoSymbol) || cryptoSymbol.includes(symbol))
        );

        if (!isCryptoSymbol) {
            return;
        }

        const price = parseFloat(message.LastPrice) || parseFloat(message.Price) || 0;

        if (price > 0) {
            const cryptoData: CryptoData = {
                symbol: symbol,
                source: 'SierraChart',
                lastPrice: price,
                bid: parseFloat(message.Bid) || 0,
                ask: parseFloat(message.Ask) || 0,
                volume: parseInt(message.TotalVolume) || 0,
                timestamp: new Date(message.Timestamp || Date.now()),
                change: parseFloat(message.Change) || 0,
                changePercent: parseFloat(message.ChangePercent) || 0,
                high24h: parseFloat(message.High) || price,
                low24h: parseFloat(message.Low) || price
            };

            // Mettre à jour les données
            this.cryptoData.set(symbol, cryptoData);

            // Afficher avec l'emoji approprié
            const emoji = this.getCryptoEmoji(symbol);
            console.log(`${emoji} ${symbol}:`);
            console.log(`   💰 Prix: ${cryptoData.lastPrice.toLocaleString()}`);
            console.log(`   📈 Variation: ${cryptoData.changePercent >= 0 ? '+' : ''}${cryptoData.changePercent.toFixed(2)}%`);
            console.log(`   📊 Volume: ${cryptoData.volume.toLocaleString()}`);
            if (cryptoData.high24h > cryptoData.low24h) {
                console.log(`   🔵 Bas/Haut: ${cryptoData.low24h.toLocaleString()} / ${cryptoData.high24h.toLocaleString()}`);
            }
            console.log(`   ⏰ ${cryptoData.timestamp.toLocaleString()}`);
            console.log('   ' + '='.repeat(60));

            this.emit('cryptoData', cryptoData);
        }
    }

    private handleMarketDepth(message: any): void {
        const symbol = message.Symbol;
        if (symbol && this.isRelevantCryptoSymbol(symbol)) {
            console.log(`📊 Carnet d'ordres disponible: ${symbol}`);
        }
    }

    private handleHistoricalData(message: any): void {
        const symbol = message.Symbol;
        const close = parseFloat(message.Close);

        if (symbol && this.isRelevantCryptoSymbol(symbol) && close > 0) {
            console.log(`📈 Données historiques: ${symbol} → ${close.toLocaleString()}`);
        }
    }

    private getCryptoEmoji(symbol: string): string {
        if (symbol.includes('BTC') || symbol.includes('XBT')) return '🟠';
        if (symbol.includes('ETH')) return '🔷';
        if (symbol.includes('DOGE')) return '🐕';
        if (symbol.includes('SOL')) return '🟣';
        if (symbol.includes('BNB')) return '🟡';
        if (symbol.includes('USDT')) return '💵';
        return '🪙';
    }

    private isRelevantCryptoSymbol(symbol: string): boolean {
        const relevantSymbols = [
            'XBTUSD-BMEX', 'ETHUSD-BMEX', 'BTCUSD-BMEX',
            'XBTUSD', 'ETHUSD', 'BTCUSD',
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT',
            'BTC', 'ETH', 'DOGE', 'SOL'
        ];

        return relevantSymbols.some(relevant =>
            symbol && (symbol.includes(relevant) || relevant.includes(symbol))
        );
    }

    private subscribeToCrypto(): void {
        console.log('\n🚀 Abonnement aux crypto-monnaies via Sierra Chart...');

        // Symboles confirmés qui fonctionnent selon votre expérience
        const workingSymbols = [
            'XBTUSD-BMEX',  // Celui que vous avez confirmé
            'ETHUSD-BMEX',
            'BTCUSD-BMEX',
            'XBTUSD',
            'ETHUSD',
            'BTCUSD'
        ];

        console.log('\n🔴 Symboles BitMEX testés (confirmez dans Sierra Chart):');
        workingSymbols.forEach((symbol, index) => {
            setTimeout(() => {
                console.log(`   📊 Souscription: ${symbol}`);
                this.subscribeToSymbol(symbol);
            }, index * 300);
        });

        // Snapshots
        setTimeout(() => {
            console.log('\n📷 Snapshots demandés:');
            workingSymbols.forEach((symbol, index) => {
                setTimeout(() => {
                    console.log(`   📷 Snapshot: ${symbol}`);
                    this.requestSnapshot(symbol);
                }, index * 300);
            });
        }, workingSymbols.length * 300 + 1000);

        // Demander les symboles disponibles
        setTimeout(() => {
            this.requestAvailableSymbols();
        }, workingSymbols.length * 600 + 2000);
    }

    private subscribeToSymbol(symbol: string): void {
        this.sendMessage({
            Type: 2002,  // SUBSCRIBE_TO_SYMBOL
            Symbol: symbol,
            Exchange: '',
            RequestID: Date.now() + Math.random()
        });
    }

    private requestSnapshot(symbol: string): void {
        this.sendMessage({
            Type: 2003,  // REQUEST_MARKET_DATA
            Symbol: symbol,
            Exchange: '',
            RequestID: Date.now() + Math.random()
        });
    }

    private requestAvailableSymbols(): void {
        console.log('\n📋 Demande symboles crypto disponibles...');

        const requests = [
            { Type: 2008, Exchange: '' }, // SYMBOLS_REQUEST
            { Type: 2009, Exchange: '' }, // EXCHANGE_LIST_REQUEST
            { Type: 2010, Exchange: '' }  // SECURITY_DEFINITION_REQUEST
        ];

        requests.forEach((req, index) => {
            setTimeout(() => {
                this.sendMessage(req);
                console.log(`   Demande liste symboles (Type ${req.Type})`);
            }, index * 500);
        });
    }

    /**
     * Obtenir rapidement le prix d'un symbole crypto
     */
    async getCryptoPrice(symbol: string): Promise<number | null> {
        return new Promise((resolve, reject) => {
            if (!this.isAuthenticated) {
                reject(new Error('Crypto non authentifié'));
                return;
            }

            // Si on a déjà des données récentes (< 5 secondes), les utiliser
            const existingData = this.cryptoData.get(symbol);
            if (existingData && (Date.now() - existingData.timestamp.getTime()) < 5000) {
                resolve(existingData.lastPrice);
                return;
            }

            const timeout = setTimeout(() => {
                this.removeListener('cryptoData', onData);
                resolve(null);
            }, 8000);

            const onData = (data: CryptoData) => {
                if (data.symbol === symbol || data.symbol.includes(symbol)) {
                    clearTimeout(timeout);
                    this.removeListener('cryptoData', onData);
                    resolve(data.lastPrice);
                }
            };

            this.on('cryptoData', onData);
            this.requestSnapshot(symbol);
        });
    }

    /**
     * Obtenir toutes les données crypto actuelles
     */
    getAllCryptoData(): CryptoData[] {
        return Array.from(this.cryptoData.values());
    }

    /**
     * Obtenir les symboles crypto disponibles
     */
    getAvailableCryptoSymbols(): string[] {
        return Array.from(this.cryptoData.keys());
    }

    /**
     * Vérifier si connecté
     */
    isReady(): boolean {
        return this.isConnected && this.isAuthenticated;
    }

    /**
     * Statistiques de connexion
     */
    getStats(): any {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            messageCount: this.messageCount,
            cryptoSymbolsCount: this.cryptoData.size,
            availableSymbols: this.getAvailableCryptoSymbols(),
            lastUpdate: this.cryptoData.size > 0 ? Math.max(...Array.from(this.cryptoData.values()).map(d => d.timestamp.getTime())) : null
        };
    }

    /**
     * Déconnexion
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('🔌 Déconnexion Crypto Sierra Chart');
    }
}

async function main() {
    const cryptoClient = new CryptoSierraChart();

    cryptoClient.on('authenticated', () => {
        console.log('\n🎉 Crypto Sierra Chart connecté et authentifié !\n');
    });

    cryptoClient.on('cryptoData', (data: CryptoData) => {
        // Info déjà affichée dans handleCryptoMarketData
    });

    cryptoClient.on('error', (error: Error) => {
        console.error('❌ Erreur Crypto:', error.message);
    });

    try {
        await cryptoClient.connect();

        // Test après 20 secondes
        setTimeout(async () => {
            console.log('\n🎯 Test récupération prix crypto...');

            const xbtPrice = await cryptoClient.getCryptoPrice('XBTUSD-BMEX');
            const ethPrice = await cryptoClient.getCryptoPrice('ETHUSD-BMEX');
            const stats = cryptoClient.getStats();
            const availableSymbols = cryptoClient.getAvailableCryptoSymbols();

            console.log(`💰 Résultats Crypto:
   XBTUSD-BMEX: ${xbtPrice ? xbtPrice.toLocaleString() : 'Non disponible'}
   ETHUSD-BMEX: ${ethPrice ? ethPrice.toLocaleString() : 'Non disponible'}
   Symboles trouvés: ${stats.cryptoSymbolsCount}
   Messages reçus: ${stats.messageCount}
   Connecté: ${stats.connected ? 'Oui' : 'Non'}

   📋 Symboles disponibles: ${availableSymbols.length > 0 ? availableSymbols.join(', ') : 'Aucun'}`);
        }, 20000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt Crypto...');
            cryptoClient.disconnect();
            process.exit(0);
        });

        console.log('🚀 Client Crypto Sierra Chart démarré. Surveillance des crypto-monnaies...\n');

    } catch (error) {
        console.error('❌ Erreur fatale Crypto:', error);
        process.exit(1);
    }
}

export default CryptoSierraChart;

if (require.main === module) {
    main();
}