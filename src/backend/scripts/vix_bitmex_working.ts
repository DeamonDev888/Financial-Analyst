import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface BitMEXData {
    symbol: string;
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

export class SierraChartBitMEX extends EventEmitter {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private messageCount: number = 0;

    constructor() {
        super();
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔌 Connexion Sierra Chart BitMEX sur ws://localhost:11099');
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
                    this.emit('error', error);
                    reject(error);
                });

                this.ws.on('close', () => {
                    console.log('🔌 WebSocket fermé');
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
                    console.log('✅ Authentifié - Demarrage surveillance BitMEX...');
                    this.isAuthenticated = true;
                    this.emit('authenticated');
                    setTimeout(() => this.subscribeToBitMEX(), 1000);
                } else {
                    console.error('❌ Authentification échouée:', message.ResultText);
                }
                break;

            case 3001:  // MARKET_DATA
                this.handleMarketData(message);
                break;

            case 11:   // MARKET_DATA_REJECT
                console.log(`❌ Symbol rejeté: ${message.Symbol} - ${message.RejectText}`);
                break;

            case 104:  // MARKET_DEPTH_UPDATE
                this.handleMarketDepth(message);
                break;

            case 3:    // HEARTBEAT
                // Silencieux
                break;

            default:
                if (this.messageCount <= 10) {
                    console.log(`📨 [${this.messageCount}] Type ${message.Type}:`, JSON.stringify(message).substring(0, 150));
                }
        }
    }

    private handleMarketData(message: any): void {
        const symbol = message.Symbol || message.SymbolCode;
        if (!symbol || !symbol.includes('XBTUSD')) return;

        const price = parseFloat(message.LastPrice) || parseFloat(message.Price) || 0;

        if (price > 0) {
            const bitmexData: BitMEXData = {
                symbol: symbol,
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

            console.log(`🔴 BitMEX XBTUSD: ${bitmexData.lastPrice.toLocaleString()}`);
            console.log(`   💰 Bid/Ask: ${bitmexData.bid.toLocaleString()} / ${bitmexData.ask.toLocaleString()}`);
            console.log(`   📈 24h: ${bitmexData.low24h.toLocaleString()} - ${bitmexData.high24h.toLocaleString()}`);
            console.log(`   📊 Volume: ${bitmexData.volume.toLocaleString()}`);
            console.log(`   ⏰ ${bitmexData.timestamp.toLocaleString()}`);
            console.log('   ' + '═'.repeat(60));

            this.emit('bitmexData', bitmexData);
        }
    }

    private handleMarketDepth(message: any): void {
        if (message.Symbol && message.Symbol.includes('XBTUSD')) {
            console.log(`📊 Carnet d'ordres XBTUSD disponible`);
        }
    }

    private subscribeToBitMEX(): void {
        console.log('\n🚀 Abonnement aux symboles BitMEX qui fonctionnent:');

        // Symboles confirmés qui fonctionnent
        const workingSymbols = [
            'XBTUSD-BMEX',
            'ETHUSD-BMEX',
            'BTCUSD-BMEX',
            'XBTUSD',
            'ETHUSD'
        ];

        workingSymbols.forEach((symbol, index) => {
            setTimeout(() => {
                console.log(`   📊 Souscription: ${symbol}`);
                this.subscribeToSymbol(symbol);
            }, index * 500);
        });

        // Demander les snapshots après toutes les souscriptions
        setTimeout(() => {
            workingSymbols.forEach((symbol, index) => {
                setTimeout(() => {
                    console.log(`   📷 Snapshot: ${symbol}`);
                    this.requestSnapshot(symbol);
                }, index * 500);
            });
        }, workingSymbols.length * 500 + 1000);
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

    /**
     * Obtenir rapidement le prix XBTUSD
     */
    async getXBTUSDPrice(): Promise<number | null> {
        return new Promise((resolve, reject) => {
            if (!this.isAuthenticated) {
                reject(new Error('Pas authentifié'));
                return;
            }

            const timeout = setTimeout(() => {
                this.removeListener('bitmexData', onData);
                resolve(null);
            }, 5000);

            const onData = (data: BitMEXData) => {
                if (data.symbol.includes('XBTUSD')) {
                    clearTimeout(timeout);
                    this.removeListener('bitmexData', onData);
                    resolve(data.lastPrice);
                }
            };

            this.on('bitmexData', onData);
            this.requestSnapshot('XBTUSD-BMEX');
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('🔌 Déconnexion BitMEX');
    }
}

async function main() {
    const bitmex = new SierraChartBitMEX();

    bitmex.on('authenticated', () => {
        console.log('🎉 Connecté à BitMEX via Sierra Chart !\n');
    });

    bitmex.on('bitmexData', (data: BitMEXData) => {
        // Info déjà affichée dans handleMarketData
    });

    bitmex.on('error', (error: Error) => {
        console.error('❌ Erreur:', error.message);
    });

    try {
        await bitmex.connect();

        // Test rapide après 10 secondes
        setTimeout(async () => {
            console.log('\n🎯 Test rapide de récupération prix XBTUSD...');
            const price = await bitmex.getXBTUSDPrice();
            if (price) {
                console.log(`💰 XBTUSD actuel: ${price.toLocaleString()}`);
            } else {
                console.log('❌ Prix XBTUSD non reçu');
            }
        }, 10000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt...');
            bitmex.disconnect();
            process.exit(0);
        });

        console.log('🚀 Client BitMEX démarré. Surveillance XBTUSD en temps réel...');

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

export default SierraChartBitMEX;

if (require.main === module) {
    main();
}