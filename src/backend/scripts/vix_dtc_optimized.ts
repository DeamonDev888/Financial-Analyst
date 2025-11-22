import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface VIXRealTimeData {
    symbol: string;
    lastPrice: number;
    bid: number;
    ask: number;
    bidSize: number;
    askSize: number;
    volume: number;
    timestamp: Date;
    change: number;
    changePercent: number;
    sessionDate: string;
}

export interface VIXHistoricalData {
    symbol: string;
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    barInterval: number;
}

export interface DTCMessage {
    Type: number;
    [key: string]: any;
}

export class SierraChartDTCOptimized extends EventEmitter {
    private ws: WebSocket | null = null;
    private host: string;
    private port: number;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private messageCount: number = 0;
    private lastReceivedData: Date | null = null;

    constructor(host: string = 'localhost', port: number = 11099) {
        super();
        this.host = host;
        this.port = port;
    }

    /**
     * Connexion au serveur DTC de Sierra Chart
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `ws://${this.host}:${this.port}`;
                console.log(`🔌 Connexion à Sierra Chart DTC sur ${wsUrl}`);

                this.ws = new WebSocket(wsUrl);

                this.ws.on('open', () => {
                    console.log('✅ WebSocket connecté');
                    this.isConnected = true;
                    this.sendLogon();
                    resolve();
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error: Error) => {
                    console.error('❌ Erreur WebSocket:', error.message);
                    this.emit('error', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

                this.ws.on('close', (code: number, reason: Buffer) => {
                    console.log(`🔌 WebSocket fermé - Code: ${code}, Reason: ${reason.toString()}`);
                    this.isConnected = false;
                    this.isAuthenticated = false;
                    if (this.heartbeatInterval) {
                        clearInterval(this.heartbeatInterval);
                        this.heartbeatInterval = null;
                    }
                    this.emit('disconnected');
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Envoyer un message DTC au bon format
     */
    private sendDTCMessage(message: DTCMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket non connecté');
            return;
        }

        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
        console.log(`📤 Message envoyé - Type: ${message.Type}`);
    }

    /**
     * LOGON_REQUEST (Type 1)
     */
    private sendLogon(): void {
        const logonMessage: DTCMessage = {
            Type: 1,  // LOGON_REQUEST
            Username: 'DEMO',
            Password: 'DEMO',
            ProtocolVersion: 8,
            heartbeatIntervalSec: 60
        };

        this.sendDTCMessage(logonMessage);
    }

    /**
     * LOGON_RESPONSE (Type 1)
     */
    private handleLogonResponse(message: any): void {
        console.log('🔐 Réponse Logon:', message);

        if (message.Result === 1) {  // Success
            console.log('✅ Authentification réussie');
            this.isAuthenticated = true;
            this.emit('authenticated');
            this.startHeartbeat();
        } else {
            console.error('❌ Échec authentification:', message.ErrorText);
            this.emit('authenticationError', message.ErrorText);
        }
    }

    /**
     * Démarrer le heartbeat
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.isAuthenticated) {
                this.sendHeartbeat();
            }
        }, 120000); // Toutes les 2 minutes comme recommandé
    }

    /**
     * Envoyer un heartbeat
     */
    private sendHeartbeat(): void {
        const heartbeatMessage: DTCMessage = {
            Type: 50,  // HEARTBEAT
            Timestamp: Date.now()
        };
        this.sendDTCMessage(heartbeatMessage);
    }

    /**
     * Souscrire au VIX en temps réel (Type 2002)
     */
    subscribeToVIXRealTime(symbol: string = 'VIX'): void {
        if (!this.isAuthenticated) {
            throw new Error('Pas authentifié - utilisez connect() d\'abord');
        }

        const subscribeMessage: DTCMessage = {
            Type: 2002,  // SUBSCRIBE_TO_SYMBOL
            Symbol: symbol,
            Exchange: '',
            RequestID: Date.now()
        };

        this.sendDTCMessage(subscribeMessage);
        console.log(`📊 Souscription aux données temps réel pour ${symbol}`);
    }

    /**
     * Demander un snapshot des données VIX (Type 2003)
     */
    requestVIXSnapshot(symbol: string = 'VIX'): void {
        if (!this.isAuthenticated) {
            throw new Error('Pas authentifié - utilisez connect() d\'abord');
        }

        const snapshotMessage: DTCMessage = {
            Type: 2003,  // REQUEST_MARKET_DATA
            Symbol: symbol,
            Exchange: '',
            RequestID: Date.now()
        };

        this.sendDTCMessage(snapshotMessage);
        console.log(`📷 Snapshot demandé pour ${symbol}`);
    }

    /**
     * Demander les données historiques du VIX (Type 2006)
     */
    requestVIXHistoricalData(
        symbol: string = 'VIX',
        startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
        endDate: Date = new Date(),
        barInterval: number = 1440 // 1 jour par défaut
    ): void {
        if (!this.isAuthenticated) {
            throw new Error('Pas authentifié - utilisez connect() d\'abord');
        }

        const formatDate = (date: Date): string => {
            return date.toISOString().replace('T', ' ').substring(0, 19);
        };

        const historicalRequest: DTCMessage = {
            Type: 2006,  // HISTORICAL_PRICE_DATA_REQUEST
            Symbol: symbol,
            Exchange: '',
            StartDateTime: formatDate(startDate),
            EndDateTime: formatDate(endDate),
            BarInterval: barInterval,
            RequestID: Date.now()
        };

        this.sendDTCMessage(historicalRequest);
        console.log(`📈 Données historiques demandées pour ${symbol} (${formatDate(startDate)} → ${formatDate(endDate)})`);
    }

    /**
     * Traitement des messages reçus
     */
    private handleMessage(data: Buffer): void {
        try {
            const messages = data.toString('utf8').split('\0').filter(msg => msg.trim());

            for (const msgStr of messages) {
                if (msgStr.trim()) {
                    const message = JSON.parse(msgStr);
                    this.processDTCMessage(message);
                }
            }
        } catch (error) {
            console.error('❌ Erreur traitement message:', error);
        }
    }

    /**
     * Traitement individuel des messages DTC
     */
    private processDTCMessage(message: DTCMessage): void {
        this.messageCount++;
        this.lastReceivedData = new Date();

        switch (message.Type) {
            case 2:  // LOGON_RESPONSE
                this.handleLogonResponse(message);
                break;

            case 3001:  // MARKET_DATA (réponse temps réel)
                this.handleMarketData(message);
                break;

            case 3006:  // HISTORICAL_PRICE_DATA (réponse historique)
                this.handleHistoricalData(message);
                break;

            case 50:   // HEARTBEAT
                // Silencieux pour éviter le spam
                break;

            case 51:   // HEARTBEAT_RESPONSE
                // Silencieux pour éviter le spam
                break;

            case 3:    // ENCODING_AND_HEARTBEAT_MESSAGE
                // Messages système silencieux
                break;

            case 11:   // MARKET_DATA_REJECT
                console.log(`❌ Market Data Rejeté: ${message.RejectText || message.Reason}`);
                break;

            case 104:  // MARKET_DEPTH_UPDATE
                // Données de carnet d'ordres
                break;

            default:
                // Afficher les messages non traités mais limiter le spam
                if (this.messageCount <= 50 || this.messageCount % 100 === 0) {
                    console.log(`📨 [${this.messageCount}] Message Type ${message.Type}:`, JSON.stringify(message).substring(0, 200));
                }
        }
    }

    /**
     * MARKET_DATA (Type 3001) - Données temps réel
     */
    private handleMarketData(message: any): void {
        const vixData: VIXRealTimeData = {
            symbol: message.Symbol || message.SymbolCode || 'VIX',
            lastPrice: parseFloat(message.LastPrice) || 0,
            bid: parseFloat(message.Bid) || 0,
            ask: parseFloat(message.Ask) || 0,
            bidSize: parseInt(message.BidSize) || 0,
            askSize: parseInt(message.AskSize) || 0,
            volume: parseInt(message.TotalVolume) || 0,
            timestamp: new Date(message.Timestamp || Date.now()),
            change: parseFloat(message.Change) || 0,
            changePercent: parseFloat(message.ChangePercent) || 0,
            sessionDate: message.SessionDate || new Date().toISOString().split('T')[0]
        };

        console.log(`📊 Données VIX temps réel:
        Prix: ${vixData.lastPrice}
        Bid/Ask: ${vixData.bid}/${vixData.ask}
        Volume: ${vixData.volume}
        Variation: ${vixData.changePercent >= 0 ? '+' : ''}${vixData.changePercent.toFixed(2)}%
        Timestamp: ${vixData.timestamp.toLocaleString()}`);

        this.emit('vixRealTimeData', vixData);
    }

    /**
     * HISTORICAL_PRICE_DATA (Type 3006) - Données historiques
     */
    private handleHistoricalData(message: any): void {
        const historicalData: VIXHistoricalData = {
            symbol: message.Symbol || 'VIX',
            date: new Date(message.StartDateTime),
            open: parseFloat(message.Open) || 0,
            high: parseFloat(message.High) || 0,
            low: parseFloat(message.Low) || 0,
            close: parseFloat(message.Close) || 0,
            volume: parseInt(message.Volume) || 0,
            barInterval: parseInt(message.BarInterval) || 1440
        };

        console.log(`📈 Donnée historique VIX:
        Date: ${historicalData.date.toLocaleDateString()}
        OHLC: ${historicalData.open}/${historicalData.high}/${historicalData.low}/${historicalData.close}
        Volume: ${historicalData.volume}`);

        this.emit('vixHistoricalData', historicalData);
    }

    /**
     * Méthode utilitaire pour obtenir rapidement le prix actuel du VIX
     */
    async getCurrentVIXPrice(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (!this.isAuthenticated) {
                reject(new Error('Pas authentifié'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout - aucune réponse du VIX'));
            }, 10000);

            const onData = (data: VIXRealTimeData) => {
                clearTimeout(timeout);
                this.removeListener('vixRealTimeData', onData);
                resolve(data.lastPrice);
            };

            this.on('vixRealTimeData', onData);
            this.requestVIXSnapshot();
        });
    }

    /**
     * Déconnexion propre
     */
    disconnect(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('🔌 Déconnexion manuelle');
    }

    /**
     * Vérifier le statut
     */
    getStatus(): { connected: boolean; authenticated: boolean } {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated
        };
    }
}

/**
 * Exemple d'utilisation complet avec crypto 24/7
 */
async function main() {
    const client = new SierraChartDTCOptimized();

    // Symboles à tester (disponibles 24/7)
    const symbols = [
        'VIX', // Traditionnel (pour quand les marchés sont ouverts)
        'DOGEUSDT-BMEX',
        'ETHUSD-BMEX',
        'SOLUSDT-BMEX',
        'XBTUSD-BMEX',
        'BTCUSDT_PERP_BINANCE'
    ];

    // Gestion des événements
    client.on('authenticated', () => {
        console.log('✅ Authentifié - Prêt à recevoir les données');

        console.log('\n🚀 Souscription aux symboles 24/7:');
        symbols.forEach(symbol => {
            console.log(`   • ${symbol}`);
        });

        // S'abonner à tous les symboles en temps réel
        symbols.forEach(symbol => {
            client.subscribeToVIXRealTime(symbol);
        });

        // Demander un snapshot immédiat pour chaque symbole
        setTimeout(() => {
            symbols.forEach((symbol, index) => {
                setTimeout(() => {
                    client.requestVIXSnapshot(symbol);
                }, index * 500); // 500ms entre chaque demande
            });
        }, 1000);
    });

    client.on('vixRealTimeData', (data: VIXRealTimeData) => {
        // Adapter l'affichage selon le symbole
        const symbolEmoji = data.symbol.includes('BTC') || data.symbol.includes('ETH') || data.symbol.includes('DOGE') || data.symbol.includes('SOL') || data.symbol.includes('XBT') ? '🪙' : '📊';
        const symbolName = data.symbol.replace('VIX', 'VIX');

        console.log(`${symbolEmoji} ${symbolName}: ${data.lastPrice.toLocaleString()} ${data.changePercent >= 0 ? '📈' : '📉'} ${data.changePercent.toFixed(2)}% | Vol: ${data.volume.toLocaleString()}`);
    });

    client.on('vixHistoricalData', (data: VIXHistoricalData) => {
        const symbolEmoji = data.symbol.includes('BTC') || data.symbol.includes('ETH') || data.symbol.includes('DOGE') || data.symbol.includes('SOL') || data.symbol.includes('XBT') ? '🪙' : '📊';
        console.log(`${symbolEmoji} ${data.symbol} HIST: ${data.date.toLocaleDateString()} → ${data.close.toLocaleString()}`);
    });

    client.on('error', (error: Error) => {
        console.error('❌ Erreur:', error.message);
    });

    client.on('disconnected', () => {
        console.log('🔌 Déconnecté');
        process.exit(0);
    });

    try {
        // Connexion
        await client.connect();

        // Nettoyage
        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt...');
            client.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

export default SierraChartDTCOptimized;

if (require.main === module) {
    main();
}