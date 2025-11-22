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

export interface DTCMessage {
    Type: number;
    [key: string]: any;
}

export class SierraChartVIXPersistent extends EventEmitter {
    private ws: WebSocket | null = null;
    private host: string;
    private port: number;
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;
    private messageCount: number = 0;
    private lastReceivedData: Date | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private stayConnected: boolean = true;

    constructor(host: string = 'localhost', port: number = 11099) {
        super();
        this.host = host;
        this.port = port;
    }

    /**
     * Connexion persistante au serveur DTC
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `ws://${this.host}:${this.port}`;
                console.log(`🔌 Connexion persistante à Sierra Chart sur ${wsUrl}`);

                this.ws = new WebSocket(wsUrl);

                this.ws.on('open', () => {
                    console.log('✅ WebSocket connecté');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
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
                    console.log(`🔌 WebSocket fermé - Code: ${code}`);
                    this.isConnected = false;
                    this.isAuthenticated = false;
                    if (this.heartbeatInterval) {
                        clearInterval(this.heartbeatInterval);
                        this.heartbeatInterval = null;
                    }
                    this.emit('disconnected');

                    // Reconnexion automatique si souhaité
                    if (this.stayConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.handleReconnect();
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gestion de la reconnexion automatique
     */
    private async handleReconnect(): Promise<void> {
        this.reconnectAttempts++;
        console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans 5 secondes...`);

        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('❌ Échec reconnexion:', error);
            }
        }, 5000);
    }

    /**
     * Envoyer un message DTC
     */
    private sendDTCMessage(message: DTCMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket non connecté');
            return;
        }

        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
        console.log(`📤 Message Type ${message.Type} envoyé`);
    }

    /**
     * LOGON_REQUEST (Type 1)
     */
    private sendLogon(): void {
        const logonMessage: DTCMessage = {
            Type: 1,
            Username: 'DEMO',
            Password: 'DEMO',
            ProtocolVersion: 8,
            heartbeatIntervalSec: 60
        };

        this.sendDTCMessage(logonMessage);
    }

    /**
     * LOGON_RESPONSE (Type 2)
     */
    private handleLogonResponse(message: any): void {
        console.log('🔐 Réponse Logon reçue');
        if (message.Result === 1) {
            console.log('✅ Authentification réussie');
            this.isAuthenticated = true;
            this.emit('authenticated');
            this.startHeartbeat();

            // Démarrer la surveillance des symboles après authentification
            setTimeout(() => {
                this.startSymbolMonitoring();
            }, 2000);
        } else {
            console.error('❌ Échec authentification:', message.ResultText);
            this.emit('authenticationError', message.ResultText);
        }
    }

    /**
     * Démarrer la surveillance des symboles
     */
    private startSymbolMonitoring(): void {
        console.log('\n🚀 Démarrage surveillance des symboles crypto...');

        const symbols = [
            'BTCUSDT_PERP_BINANCE',
            'ETHUSD-BMEX',
            'DOGEUSDT-BMEX',
            'SOLUSDT-BMEX',
            'XBTUSD-BMEX'
        ];

        symbols.forEach((symbol, index) => {
            setTimeout(() => {
                this.subscribeToSymbol(symbol);
                this.requestSnapshot(symbol);
            }, index * 1000);
        });
    }

    /**
     * S'abonner à un symbole
     */
    private subscribeToSymbol(symbol: string): void {
        const subscribeMessage: DTCMessage = {
            Type: 2002,  // SUBSCRIBE_TO_SYMBOL
            Symbol: symbol,
            Exchange: '',
            RequestID: Date.now() + Math.random()
        };

        this.sendDTCMessage(subscribeMessage);
        console.log(`📊 Souscription temps réel: ${symbol}`);
    }

    /**
     * Demander un snapshot
     */
    private requestSnapshot(symbol: string): void {
        const snapshotMessage: DTCMessage = {
            Type: 2003,  // REQUEST_MARKET_DATA
            Symbol: symbol,
            Exchange: '',
            RequestID: Date.now() + Math.random()
        };

        this.sendDTCMessage(snapshotMessage);
        console.log(`📷 Snapshot demandé: ${symbol}`);
    }

    /**
     * Heartbeat
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.isAuthenticated) {
                this.sendHeartbeat();
            }
        }, 120000);
    }

    private sendHeartbeat(): void {
        const heartbeatMessage: DTCMessage = {
            Type: 50,
            Timestamp: Date.now()
        };
        this.sendDTCMessage(heartbeatMessage);
    }

    /**
     * Traitement des messages
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
     * Traitement des messages DTC
     */
    private processDTCMessage(message: DTCMessage): void {
        this.messageCount++;
        this.lastReceivedData = new Date();

        switch (message.Type) {
            case 2:  // LOGON_RESPONSE
                this.handleLogonResponse(message);
                break;

            case 3001:  // MARKET_DATA
                this.handleMarketData(message);
                break;

            case 3:   // ENCODING_AND_HEARTBEAT_MESSAGE
                // Silencieux
                break;

            case 11:   // MARKET_DATA_REJECT
                console.log(`❌ Market Data Rejeté: ${message.RejectText || 'Pas de raison spécifiée'}`);
                break;

            case 104:  // MARKET_DEPTH_UPDATE
                // Carnet d'ordres
                break;

            default:
                // Afficher seulement les messages intéressants pour debug
                if (this.messageCount <= 20 || message.Type === 3001 || message.Type === 11) {
                    console.log(`📨 [${this.messageCount}] Type ${message.Type}:`, JSON.stringify(message).substring(0, 150));
                }
        }
    }

    /**
     * Données de marché
     */
    private handleMarketData(message: any): void {
        try {
            const vixData: VIXRealTimeData = {
                symbol: message.Symbol || message.SymbolCode || 'UNKNOWN',
                lastPrice: parseFloat(message.LastPrice) || parseFloat(message.Price) || 0,
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

            if (vixData.lastPrice > 0) {
                const symbolEmoji = vixData.symbol.includes('BTC') || vixData.symbol.includes('ETH') || vixData.symbol.includes('DOGE') || vixData.symbol.includes('SOL') || vixData.symbol.includes('XBT') ? '🪙' : '📊';

                console.log(`${symbolEmoji} ${vixData.symbol}:`);
                console.log(`   💰 Prix: ${vixData.lastPrice.toLocaleString()}`);
                console.log(`   📈 Variation: ${vixData.changePercent >= 0 ? '+' : ''}${vixData.changePercent.toFixed(4)}%`);
                console.log(`   📊 Volume: ${vixData.volume.toLocaleString()}`);
                console.log(`   ⏰ ${vixData.timestamp.toLocaleString()}`);
                console.log('   ' + '=' .repeat(40));

                this.emit('marketData', vixData);
            }

        } catch (error) {
            console.error('❌ Erreur traitement données marché:', error);
        }
    }

    /**
     * Statistiques de connexion
     */
    getStats(): any {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            messageCount: this.messageCount,
            lastReceivedData: this.lastReceivedData,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Forcer l'arrêt
     */
    stop(): void {
        this.stayConnected = false;
        this.disconnect();
    }

    /**
     * Déconnexion
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
}

/**
 * Client persistant principal
 */
async function main() {
    const client = new SierraChartVIXPersistent();

    client.on('authenticated', () => {
        console.log('🎉 Authentifié et surveillance active!');
        console.log('📡 En attente des données des symboles crypto...\n');
    });

    client.on('marketData', (data: VIXRealTimeData) => {
        console.log(`🎯 DONNÉE REÇUE: ${data.symbol} à ${data.lastPrice}`);
    });

    client.on('error', (error: Error) => {
        console.error('❌ Erreur:', error.message);
    });

    client.on('disconnected', () => {
        console.log('🔌 Déconnecté du serveur');
    });

    try {
        await client.connect();

        // Afficher les stats toutes les 30 secondes
        setInterval(() => {
            const stats = client.getStats();
            console.log(`\n📊 Stats: ${stats.messageCount} messages | ${stats.connected ? 'Connecté' : 'Déconnecté'} | ${stats.authenticated ? 'Authentifié' : 'Non authentifié'}`);
        }, 30000);

        // Gestion de l'arrêt propre
        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt en cours...');
            client.stop();
            setTimeout(() => process.exit(0), 2000);
        });

        console.log('🚀 Client démarré. Appuyez sur Ctrl+C pour arrêter.');

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

export default SierraChartVIXPersistent;

if (require.main === module) {
    main();
}