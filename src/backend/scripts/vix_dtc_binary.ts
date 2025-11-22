import { EventEmitter } from 'events';
import * as net from 'net';

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

export interface SierraChartConfig {
    host: string;
    port: number;
    symbol?: string;
}

/**
 * Client DTC binaire pour Sierra Chart
 * Utilise le protocole natif Sierra Chart au lieu de WebSocket
 */
export class SierraChartDTCClient extends EventEmitter {
    private socket: net.Socket | null = null;
    private config: SierraChartConfig;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 5000;

    constructor(config: SierraChartConfig) {
        super();
        this.config = {
            symbol: 'VIX',
            ...config
        };
    }

    /**
     * Connexion au serveur Sierra Chart via TCP
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log(`Connexion TCP à Sierra Chart sur ${this.config.host}:${this.config.port}`);

                this.socket = new net.Socket();

                this.socket.connect(this.config.port, this.config.host, () => {
                    console.log('Connecté à Sierra Chart via TCP');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.sendAuthentication();
                    resolve();
                });

                this.socket.on('data', (data: Buffer) => {
                    this.handleData(data);
                });

                this.socket.on('error', (error: Error) => {
                    console.error('Erreur socket:', error.message);
                    this.emit('error', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

                this.socket.on('close', () => {
                    console.log('Connexion fermée');
                    this.isConnected = false;
                    this.emit('disconnected');
                    this.handleReconnect();
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Construction des messages DTC (format simplifié)
     */
    private buildDTCMessage(type: string, data: any = {}): Buffer {
        // Message DTC basique
        const message = {
            MessageType: type,
            Symbol: this.config.symbol,
            ...data,
            RequestID: Date.now()
        };

        // Convertir en chaîne et puis en Buffer
        const messageStr = JSON.stringify(message) + '\r\n';
        return Buffer.from(messageStr, 'utf8');
    }

    /**
     * Envoyer l'authentification
     */
    private sendAuthentication(): void {
        if (!this.socket) return;

        const authMessage = this.buildDTCMessage('LOGON', {
            Username: 'DEMO',
            Password: 'DEMO',
            ProtocolVersion: 1
        });

        this.socket.write(authMessage);
        console.log('Message d\'authentification envoyé');
    }

    /**
     * S'abonner aux données du VIX
     */
    subscribeToVIX(): void {
        if (!this.socket || !this.isConnected) {
            throw new Error('Pas connecté à Sierra Chart');
        }

        const subscribeMessage = this.buildDTCMessage('MARKET_DATA_SUBSCRIBE', {
            Interval: 1, // 1 tick
            MaxDaysToLoad: 1
        });

        this.socket.write(subscribeMessage);
        console.log(`Abonnement aux données ${this.config.symbol} envoyé`);
    }

    /**
     * Traitement des données reçues
     */
    private handleData(data: Buffer): void {
        try {
            const dataStr = data.toString('utf8');
            console.log('Données brutes reçues:', dataStr.substring(0, 200));

            // Essayer de parser comme JSON
            const lines = dataStr.split('\r\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const message = JSON.parse(line);
                    this.processMessage(message);
                } catch (e) {
                    // Si ce n'est pas du JSON, essayer d'extraire des nombres
                    this.extractMarketData(dataStr);
                }
            }
        } catch (error) {
            console.error('Erreur traitement données:', error);
            this.extractMarketData(data.toString());
        }
    }

    /**
     * Extraire des données de marché d'une chaîne de caractères
     */
    private extractMarketData(dataStr: string): void {
        // Chercher des patterns de nombres qui pourraient être des prix
        const numberPattern = /\d+\.?\d*/g;
        const numbers = dataStr.match(numberPattern);

        if (numbers && numbers.length >= 3) {
            const lastPrice = parseFloat(numbers[0]);
            const bid = parseFloat(numbers[1]) || lastPrice;
            const ask = parseFloat(numbers[2]) || lastPrice;

            if (lastPrice > 0 && lastPrice < 1000) { // Filtre pour VIX (généralement < 100)
                const vixData: VIXData = {
                    symbol: this.config.symbol || 'VIX',
                    lastPrice: lastPrice,
                    bid: bid,
                    ask: ask,
                    volume: parseInt(numbers[3]) || 0,
                    timestamp: new Date(),
                    change: 0,
                    changePercent: 0,
                    open: lastPrice,
                    high: lastPrice,
                    low: lastPrice
                };

                console.log(`📊 VIX extrait: ${vixData.lastPrice}`);
                this.emit('vixData', vixData);
            }
        }
    }

    /**
     * Traitement des messages structurés
     */
    private processMessage(message: any): void {
        switch (message.MessageType) {
            case 'LOGON_RESPONSE':
                console.log('Réponse logon reçue');
                this.subscribeToVIX();
                break;
            case 'MARKET_DATA_UPDATE':
                this.handleMarketData(message);
                break;
            default:
                console.log('Message type:', message.MessageType);
        }
    }

    /**
     * Gestion des données de marché
     */
    private handleMarketData(message: any): void {
        const vixData: VIXData = {
            symbol: message.Symbol || this.config.symbol,
            lastPrice: parseFloat(message.LastPrice) || parseFloat(message.Price) || 0,
            bid: parseFloat(message.Bid) || 0,
            ask: parseFloat(message.Ask) || 0,
            volume: parseInt(message.Volume) || 0,
            timestamp: new Date(),
            change: parseFloat(message.Change) || 0,
            changePercent: parseFloat(message.ChangePercent) || 0,
            open: parseFloat(message.Open) || 0,
            high: parseFloat(message.High) || 0,
            low: parseFloat(message.Low) || 0
        };

        console.log(`📈 VIX: ${vixData.lastPrice} (${vixData.changePercent >= 0 ? '+' : ''}${vixData.changePercent.toFixed(2)}%)`);
        this.emit('vixData', vixData);
    }

    /**
     * Gestion de la reconnexion
     */
    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Tentative reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            setTimeout(async () => {
                try {
                    await this.connect();
                } catch (error) {
                    console.error('Échec reconnexion:', error);
                }
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnexions atteint');
            this.emit('maxReconnectAttemptsReached');
        }
    }

    /**
     * Déconnexion
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.isConnected = false;
        console.log('Déconnexion');
    }
}

/**
 * Test simple du client DTC
 */
async function main() {
    const client = new SierraChartDTCClient({
        host: 'localhost',
        port: 11099,
        symbol: '.VIX'
    });

    client.on('vixData', (data: VIXData) => {
        console.log('✅ Données VIX reçues:', data);
        client.disconnect();
        process.exit(0);
    });

    client.on('error', (error: Error) => {
        console.error('❌ Erreur:', error.message);
    });

    client.on('disconnected', () => {
        console.log('🔌 Déconnecté');
    });

    try {
        await client.connect();

        // Timeout après 15 secondes
        setTimeout(() => {
            console.log('⏰ Timeout - pas de données reçues');
            client.disconnect();
            process.exit(1);
        }, 15000);

        process.on('SIGINT', () => {
            client.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        process.exit(1);
    }
}

export default SierraChartDTCClient;

if (require.main === module) {
    main();
}