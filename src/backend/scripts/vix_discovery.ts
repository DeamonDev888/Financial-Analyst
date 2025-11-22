import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface SymbolInfo {
    symbol: string;
    exchange?: string;
    description?: string;
    hasData: boolean;
    price?: number;
}

export class SierraChartSymbolDiscovery extends EventEmitter {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private discoveredSymbols: Map<string, SymbolInfo> = new Map();
    private messageCount: number = 0;

    constructor() {
        super();
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔍 Connexion Discovery à Sierra Chart...');
                this.ws = new WebSocket('ws://localhost:11099');

                this.ws.on('open', () => {
                    console.log('✅ WebSocket connecté');
                    this.isConnected = true;
                    this.authenticate();
                    resolve();
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error: Error) => {
                    console.error('❌ Erreur WebSocket:', error.message);
                    reject(error);
                });

                this.ws.on('close', () => {
                    console.log('🔌 WebSocket fermé');
                    this.isConnected = false;
                    this.isAuthenticated = false;
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
        console.log('🔐 Authentification envoyée');
    }

    private sendMessage(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
    }

    private handleMessage(data: Buffer): void {
        try {
            const messages = data.toString('utf8').split('\0').filter(msg => msg.trim());

            for (const msgStr of messages) {
                if (msgStr.trim()) {
                    this.messageCount++;
                    const message = JSON.parse(msgStr);
                    this.processMessage(message);
                }
            }
        } catch (error) {
            console.error('❌ Erreur traitement message:', error);
        }
    }

    private processMessage(message: any): void {
        switch (message.Type) {
            case 2:  // LOGON_RESPONSE
                if (message.Result === 1) {
                    console.log('✅ Authentifié - Démarrage découverte...');
                    this.isAuthenticated = true;
                    this.emit('authenticated');
                    setTimeout(() => this.startDiscovery(), 1000);
                } else {
                    console.error('❌ Authentification échouée:', message.ResultText);
                }
                break;

            case 3001:  // MARKET_DATA
                this.handleMarketData(message);
                break;

            case 11:   // MARKET_DATA_REJECT
                this.handleMarketDataReject(message);
                break;

            case 104:  // MARKET_DEPTH_UPDATE
                this.handleMarketDepth(message);
                break;

            case 3006:  // HISTORICAL_PRICE_DATA
                this.handleHistoricalData(message);
                break;

            case 3:    // HEARTBEAT
                if (this.messageCount % 12 === 0) { // Every minute
                    this.printDiscoveryStatus();
                }
                break;

            default:
                if (this.messageCount <= 20 || this.messageCount % 100 === 0) {
                    console.log(`📨 [${this.messageCount}] Type ${message.Type}:`, JSON.stringify(message).substring(0, 100));
                }
        }
    }

    private handleMarketData(message: any): void {
        const symbol = message.Symbol || message.SymbolCode;
        if (!symbol) return;

        const price = parseFloat(message.LastPrice) || parseFloat(message.Price) || 0;

        if (price > 0) {
            let symbolInfo = this.discoveredSymbols.get(symbol);
            if (!symbolInfo) {
                symbolInfo = {
                    symbol: symbol,
                    hasData: false,
                    price: undefined
                };
                this.discoveredSymbols.set(symbol, symbolInfo);
            }

            symbolInfo.hasData = true;
            symbolInfo.price = price;

            console.log(`🎯 DONNÉE TROUVÉE: ${symbol} = ${price.toLocaleString()}`);
            this.emit('symbolDiscovered', symbolInfo);
        }
    }

    private handleMarketDataReject(message: any): void {
        const symbol = message.Symbol;
        console.log(`❌ Symbol rejeté: ${symbol} - ${message.RejectText}`);

        let symbolInfo = this.discoveredSymbols.get(symbol);
        if (!symbolInfo) {
            symbolInfo = {
                symbol: symbol,
                hasData: false
            };
            this.discoveredSymbols.set(symbol, symbolInfo);
        }
        symbolInfo.hasData = false;
    }

    private handleMarketDepth(message: any): void {
        const symbol = message.Symbol;
        if (symbol && !this.discoveredSymbols.has(symbol)) {
            this.discoveredSymbols.set(symbol, {
                symbol: symbol,
                hasData: true // Market depth means data is available
            });
            console.log(`📊 Carnet d'ordres disponible: ${symbol}`);
        }
    }

    private handleHistoricalData(message: any): void {
        const symbol = message.Symbol;
        const close = parseFloat(message.Close);

        if (symbol && close > 0) {
            let symbolInfo = this.discoveredSymbols.get(symbol);
            if (!symbolInfo) {
                symbolInfo = {
                    symbol: symbol,
                    hasData: false
                };
                this.discoveredSymbols.set(symbol, symbolInfo);
            }

            symbolInfo.hasData = true;
            symbolInfo.price = close;
            console.log(`📈 Données historiques: ${symbol} = ${close.toLocaleString()}`);
        }
    }

    private startDiscovery(): void {
        console.log('\n🔍 LANCEMENT DISCOVERY DES SYMBOLES...\n');

        // Stratégie 1: Symboles standards avec variations
        this.testStandardSymbols();

        // Stratégie 2: Formats exchange spécifiques
        setTimeout(() => this.testExchangeFormats(), 2000);

        // Stratégie 3: Recherche par patterns
        setTimeout(() => this.testPatternSymbols(), 4000);

        // Stratégie 4: Demander les symboles disponibles
        setTimeout(() => this.requestAvailableSymbols(), 6000);
    }

    private testStandardSymbols(): void {
        console.log('📋 Test symboles standards:');
        const standardSymbols = [
            'BTC', '.BTC', 'BTCUSD', 'BTC/USD', 'BTC-USD',
            'ETH', '.ETH', 'ETHUSD', 'ETH/USD', 'ETH-USD',
            'BTCUSDT', 'ETHUSDT', 'BTC/USDT', 'ETH/USDT',
            'SPX', '.SPX', 'VIX', '.VIX', 'ES', '.ES'
        ];

        standardSymbols.forEach((symbol, index) => {
            setTimeout(() => {
                console.log(`   Test: ${symbol}`);
                this.requestSymbol(symbol);
            }, index * 100);
        });
    }

    private testExchangeFormats(): void {
        console.log('\n🏢 Test formats exchange:');
        const exchangeFormats = [
            'BTCUSD_PERP', 'ETHUSD_PERP',
            'BTCUSD_PERP_BINANCE', 'ETHUSD_PERP_BINANCE',
            'BTCUSDT_PERP_BINANCE', 'ETHUSDT_PERP_BINANCE',
            'BTCUSD-BMEX', 'ETHUSD-BMEX', 'XBTUSD-BMEX',
            'BTCUSDT-BINANCE', 'ETHUSDT-BINANCE',
            'BTC-USDT', 'ETH-USDT',
            'BTC.USD', 'ETH.USD'
        ];

        exchangeFormats.forEach((symbol, index) => {
            setTimeout(() => {
                console.log(`   Test: ${symbol}`);
                this.requestSymbol(symbol);
            }, index * 150);
        });
    }

    private testPatternSymbols(): void {
        console.log('\n🔤 Test patterns:');
        const patterns = [
            'BTC', 'ETH', 'XBT', 'USDT', 'USD',
            'BTCUSD', 'ETHUSD', 'XBTUSD',
            'BTCUSDT', 'ETHUSDT',
            'BTC-PERP', 'ETH-PERP',
            'BTC_PERP', 'ETH_PERP'
        ];

        patterns.forEach((base, index) => {
            setTimeout(() => {
                console.log(`   Test base: ${base}`);
                this.requestSymbol(base);
            }, index * 100);
        });
    }

    private requestAvailableSymbols(): void {
        console.log('\n📋 Demande symboles disponibles...');

        // Essayer différents messages pour obtenir la liste des symboles
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

    private requestSymbol(symbol: string): void {
        // Souscription
        this.sendMessage({
            Type: 2002, // SUBSCRIBE_TO_SYMBOL
            Symbol: symbol,
            RequestID: Date.now() + Math.random()
        });

        // Snapshot
        setTimeout(() => {
            this.sendMessage({
                Type: 2003, // REQUEST_MARKET_DATA
                Symbol: symbol,
                RequestID: Date.now() + Math.random()
            });
        }, 50);

        // Données historiques (court)
        setTimeout(() => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            this.sendMessage({
                Type: 2006, // HISTORICAL_PRICE_DATA_REQUEST
                Symbol: symbol,
                StartDateTime: yesterday.toISOString().replace('T', ' ').substring(0, 19),
                EndDateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
                BarInterval: 1440, // Daily
                RequestID: Date.now() + Math.random()
            });
        }, 100);
    }

    private printDiscoveryStatus(): void {
        const totalSymbols = this.discoveredSymbols.size;
        const symbolsWithData = Array.from(this.discoveredSymbols.values()).filter(s => s.hasData);

        console.log(`\n📊 STATUT DISCOVERY: ${totalSymbols} symboles testés, ${symbolsWithData.length} avec données`);

        if (symbolsWithData.length > 0) {
            console.log('✅ Symboles avec données:');
            symbolsWithData.forEach(s => {
                console.log(`   ${s.symbol}: ${s.price ? s.price.toLocaleString() : 'Prix inconnu'}`);
            });
        }
    }

    getDiscoveredSymbols(): SymbolInfo[] {
        return Array.from(this.discoveredSymbols.values());
    }

    getSymbolsWithData(): SymbolInfo[] {
        return Array.from(this.discoveredSymbols.values()).filter(s => s.hasData);
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('🔌 Discovery terminé');
    }
}

async function main() {
    const discovery = new SierraChartSymbolDiscovery();

    discovery.on('authenticated', () => {
        console.log('🎉 Discovery lancé !\n');
    });

    discovery.on('symbolDiscovered', (symbolInfo: SymbolInfo) => {
        // Info déjà affichée dans handleMarketData
    });

    try {
        await discovery.connect();

        // Afficher les résultats après 30 secondes
        setTimeout(() => {
            console.log('\n🎯 RÉSULTATS FINAUX DE LA DÉCOUVERTE:');
            const symbols = discovery.getDiscoveredSymbols();
            const symbolsWithData = discovery.getSymbolsWithData();

            console.log(`\n📈 ${symbolsWithData.length} symboles avec données:`);
            symbolsWithData.forEach(s => {
                console.log(`   ✅ ${s.symbol}: ${s.price ? s.price.toLocaleString() : 'Données disponibles'}`);
            });

            console.log(`\n❌ ${symbols.length - symbolsWithData.length} symboles sans données:`);
            symbols.filter(s => !s.hasData).forEach(s => {
                console.log(`   ❌ ${s.symbol}`);
            });

            console.log('\n🎉 Discovery terminé !');
            discovery.disconnect();
            process.exit(0);
        }, 30000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt discovery...');
            discovery.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur discovery:', error);
        process.exit(1);
    }
}

export default SierraChartSymbolDiscovery;

if (require.main === module) {
    main();
}