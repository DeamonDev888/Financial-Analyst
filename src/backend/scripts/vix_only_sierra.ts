import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface VIXData {
    symbol: string;
    lastPrice: number;
    bid: number;
    ask: number;
    volume: number;
    timestamp: Date;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
}

export class VIXSierraChart extends EventEmitter {
    private ws: WebSocket | null = null;
    private host: string;
    private port: number;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private messageCount: number = 0;
    private vixData: VIXData | null = null;

    constructor(host: string = 'localhost', port: number = 11099) {
        super();
        this.host = host;
        this.port = port;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔌 Connexion VIX Sierra Chart sur ${this.host}:${this.port}`);
                this.ws = new WebSocket(`ws://${this.host}:${this.port}`);

                this.ws.on('open', () => {
                    console.log('✅ WebSocket VIX connecté');
                    this.isConnected = true;
                    this.authenticate();
                    resolve();
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error: Error) => {
                    console.error('❌ Erreur WebSocket VIX:', error.message);
                    this.emit('error', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('🔌 WebSocket VIX fermé');
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
        console.log('🔐 Authentification VIX envoyée');
    }

    private sendMessage(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
        console.log(`📤 Message VIX Type ${message.Type} envoyé`);
    }

    private handleMessage(data: Buffer): void {
        try {
            const messages = data.toString('utf8').split('\0').filter(msg => msg.trim());

            for (const msgStr of messages) {
                if (msgStr.trim()) {
                    this.messageCount++;
                    const message = JSON.parse(msgStr);
                    this.processVIXMessage(message);
                }
            }
        } catch (error) {
            console.error('❌ Erreur traitement message VIX:', error);
        }
    }

    private processVIXMessage(message: any): void {
        switch (message.Type) {
            case 2:  // LOGON_RESPONSE
                if (message.Result === 1) {
                    console.log('✅ VIX Sierra Chart authentifié');
                    this.isAuthenticated = true;
                    this.emit('authenticated');
                    setTimeout(() => this.subscribeToVIX(), 1000);
                } else {
                    console.error('❌ Authentification VIX échouée:', message.ResultText);
                    this.emit('authenticationError', message.ResultText);
                }
                break;

            case 3001:  // MARKET_DATA
                this.handleVIXMarketData(message);
                break;

            case 11:   // MARKET_DATA_REJECT
                console.log(`❌ VIX Symbol rejeté: ${message.Symbol} - ${message.RejectText}`);
                break;

            case 3:    // HEARTBEAT
                // Silencieux
                break;

            default:
                if (this.messageCount <= 5) {
                    console.log(`📨 [${this.messageCount}] VIX Message Type ${message.Type}:`, JSON.stringify(message).substring(0, 100));
                }
        }
    }

    private handleVIXMarketData(message: any): void {
        const symbol = message.Symbol || message.SymbolCode;

        // On s'intéresse seulement aux symboles VIX
        if (!symbol || (!symbol.includes('VIX') && !symbol.includes('.VIX'))) {
            return;
        }

        const price = parseFloat(message.LastPrice) || parseFloat(message.Price) || 0;

        if (price > 0) {
            this.vixData = {
                symbol: symbol,
                lastPrice: price,
                bid: parseFloat(message.Bid) || 0,
                ask: parseFloat(message.Ask) || 0,
                volume: parseInt(message.TotalVolume) || 0,
                timestamp: new Date(message.Timestamp || Date.now()),
                change: parseFloat(message.Change) || 0,
                changePercent: parseFloat(message.ChangePercent) || 0,
                open: parseFloat(message.Open) || price,
                high: parseFloat(message.High) || price,
                low: parseFloat(message.Low) || price
            };

            console.log(`📊 VIX Sierra Chart:`);
            console.log(`   💰 Prix: ${this.vixData.lastPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
            console.log(`   📈 Variation: ${this.vixData.changePercent >= 0 ? '+' : ''}${this.vixData.changePercent.toFixed(2)}%`);
            console.log(`   📊 Volume: ${this.vixData.volume.toLocaleString()}`);
            console.log(`   🔵 Bas/Haut: ${this.vixData.low.toFixed(2)} / ${this.vixData.high.toFixed(2)}`);
            console.log(`   ⏰ ${this.vixData.timestamp.toLocaleString()}`);
            console.log('   ' + '='.repeat(60));

            this.emit('vixData', this.vixData);
        }
    }

    private subscribeToVIX(): void {
        console.log('\n🚀 Abonnement au VIX via Sierra Chart...');

        // Symboles VIX possibles à tester
        const vixSymbols = ['VIX', '.VIX'];

        vixSymbols.forEach((symbol, index) => {
            setTimeout(() => {
                console.log(`   📊 Souscription VIX: ${symbol}`);
                this.subscribeToSymbol(symbol);
            }, index * 500);
        });

        // Demander les snapshots après les souscriptions
        setTimeout(() => {
            vixSymbols.forEach((symbol, index) => {
                setTimeout(() => {
                    console.log(`   📷 Snapshot VIX: ${symbol}`);
                    this.requestSnapshot(symbol);
                }, index * 500);
            });
        }, vixSymbols.length * 500 + 1000);
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
     * Obtenir rapidement le prix VIX actuel
     */
    async getCurrentVIXPrice(): Promise<number | null> {
        return new Promise((resolve, reject) => {
            if (!this.isAuthenticated) {
                reject(new Error('VIX non authentifié'));
                return;
            }

            // Si on a déjà des données récentes (< 5 secondes), les utiliser
            if (this.vixData && (Date.now() - this.vixData.timestamp.getTime()) < 5000) {
                resolve(this.vixData.lastPrice);
                return;
            }

            const timeout = setTimeout(() => {
                this.removeListener('vixData', onData);
                resolve(null);
            }, 10000);

            const onData = (data: VIXData) => {
                clearTimeout(timeout);
                this.removeListener('vixData', onData);
                resolve(data.lastPrice);
            };

            this.on('vixData', onData);

            // Demander un nouveau snapshot
            this.requestSnapshot('VIX');
            this.requestSnapshot('.VIX');
        });
    }

    /**
     * Demander les données historiques VIX
     */
    async requestVIXHistorical(daysBack: number = 30): Promise<void> {
        if (!this.isAuthenticated) {
            throw new Error('VIX non authentifié');
        }

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

        const formatDate = (date: Date): string => {
            return date.toISOString().replace('T', ' ').substring(0, 19);
        };

        const historicalRequest = {
            Type: 2006,  // HISTORICAL_PRICE_DATA_REQUEST
            Symbol: 'VIX',
            Exchange: '',
            StartDateTime: formatDate(startDate),
            EndDateTime: formatDate(endDate),
            BarInterval: 1440, // 1 jour
            RequestID: Date.now()
        };

        console.log(`📈 Demande données historiques VIX (${formatDate(startDate)} → ${formatDate(endDate)})`);
        this.sendMessage(historicalRequest);
    }

    /**
     * Obtenir les données VIX actuelles
     */
    getCurrentVIXData(): VIXData | null {
        return this.vixData;
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
            hasVIXData: this.vixData !== null,
            lastVIXUpdate: this.vixData ? this.vixData.timestamp : null
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
        console.log('🔌 Déconnexion VIX Sierra Chart');
    }
}

async function main() {
    const vixClient = new VIXSierraChart();

    vixClient.on('authenticated', () => {
        console.log('\n🎉 VIX Sierra Chart connecté et authentifié !\n');
    });

    vixClient.on('vixData', (data: VIXData) => {
        // Info déjà affichée dans handleVIXMarketData
    });

    vixClient.on('error', (error: Error) => {
        console.error('❌ Erreur VIX:', error.message);
    });

    try {
        await vixClient.connect();

        // Test après 15 secondes
        setTimeout(async () => {
            console.log('\n🎯 Test récupération prix VIX...');

            const vixPrice = await vixClient.getCurrentVIXPrice();
            const vixData = vixClient.getCurrentVIXData();
            const stats = vixClient.getStats();

            console.log(`💰 Résultats VIX:
   Prix actuel: ${vixPrice ? vixPrice.toLocaleString() : 'Non disponible'}
   Dernière mise à jour: ${vixData ? vixData.timestamp.toLocaleString() : 'Jamais'}
   Messages reçus: ${stats.messageCount}
   Connecté: ${stats.connected ? 'Oui' : 'Non'}`);

            // Demander les données historiques
            if (stats.authenticated) {
                console.log('\n📈 Demande des données historiques VIX (7 derniers jours)...');
                await vixClient.requestVIXHistorical(7);
            }
        }, 15000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt VIX...');
            vixClient.disconnect();
            process.exit(0);
        });

        console.log('🚀 Client VIX Sierra Chart démarré. Surveillance du VIX...\n');

    } catch (error) {
        console.error('❌ Erreur fatale VIX:', error);
        process.exit(1);
    }
}

export default VIXSierraChart;

if (require.main === module) {
    main();
}