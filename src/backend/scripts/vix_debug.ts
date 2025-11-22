import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class SierraChartDebug extends EventEmitter {
    private ws: WebSocket | null = null;
    private messageCount: number = 0;

    constructor() {
        super();
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔌 Connexion DEBUG à Sierra Chart sur ws://localhost:11099');
                this.ws = new WebSocket('ws://localhost:11099');

                this.ws.on('open', () => {
                    console.log('✅ WebSocket connecté');
                    this.sendMessage({
                        Type: 1,
                        Username: 'DEMO',
                        Password: 'DEMO',
                        ProtocolVersion: 8
                    });
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
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private sendMessage(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const messageStr = JSON.stringify(message) + '\0';
        this.ws.send(messageStr);
        console.log(`📤 ENVOI: Type ${message.Type}`);
    }

    private handleMessage(data: Buffer): void {
        try {
            const messages = data.toString('utf8').split('\0').filter(msg => msg.trim());

            for (const msgStr of messages) {
                if (msgStr.trim()) {
                    this.messageCount++;
                    console.log(`\n📨 MESSAGE #${this.messageCount}:`);
                    console.log(`   Brut: ${msgStr.substring(0, 500)}${msgStr.length > 500 ? '...' : ''}`);

                    try {
                        const message = JSON.parse(msgStr);
                        console.log(`   Type: ${message.Type}`);

                        // Analyser en détail les messages de marché
                        if (message.Type === 3001 || message.Type === 3006 || message.Type === 11) {
                            console.log(`   🎯 DONNÉES DE MARCHÉ DÉTECTÉES!`);
                            console.log(JSON.stringify(message, null, 2));
                        }

                        // Si authentifié, demander les données
                        if (message.Type === 2 && message.Result === 1) {
                            console.log('✅ Authentifié - Demande des données...');
                            setTimeout(() => this.requestAllSymbols(), 1000);
                        }

                    } catch (parseError) {
                        console.log(`   ❌ Erreur parsing JSON: ${(parseError as Error).message}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur traitement message:', error);
        }
    }

    private requestAllSymbols(): void {
        const symbols = [
            'BTCUSDT_PERP_BINANCE',
            'BTCUSD_PERP_BINANCE',
            'BTC/USDT',
            'BTCUSD',
            'BTCUSDT',
            '.BTC',
            'BTC',
            'XBTUSD-BMEX',
            'BTCUSD_PERP',
            'BTC-PERP',
            'BTCUSD_PERP_BINANCE',
            'BTCUSDT_BINANCE',
            'BTC_PERP',
            'BTCUSDT_FUTURE',
            'BTCUSD_FUTURE'
        ];

        console.log(`\n🚀 Test de ${symbols.length} symboles BTC différents:`);

        symbols.forEach((symbol, index) => {
            setTimeout(() => {
                console.log(`   📊 Test: ${symbol}`);

                // Souscription
                this.sendMessage({
                    Type: 2002,
                    Symbol: symbol,
                    RequestID: Date.now() + index
                });

                // Snapshot
                setTimeout(() => {
                    this.sendMessage({
                        Type: 2003,
                        Symbol: symbol,
                        RequestID: Date.now() + index + 1000
                    });
                }, 100);

            }, index * 200);
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

async function main() {
    const client = new SierraChartDebug();

    try {
        await client.connect();

        console.log('\n🔍 Mode DEBUG ACTIF - Surveillance de TOUS les messages...');
        console.log('Appuyez sur Ctrl+C pour arrêter\n');

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt...');
            client.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}