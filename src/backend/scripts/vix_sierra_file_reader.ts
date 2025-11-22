import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface VIXData {
    symbol: string;
    lastPrice: number;
    timestamp: Date;
    change: number;
    changePercent: number;
    volume: number;
    source: string;
}

export class VIXFileReader extends EventEmitter {
    private sierraDataPath: string;
    private watchInterval: NodeJS.Timeout | null = null;
    private lastPrice: number = 0;

    constructor(dataPath: string = 'C:/SierraChart/Data/') {
        super();
        this.sierraDataPath = dataPath;
    }

    /**
     * Vérifie si les fichiers VIX existent
     */
    private checkVIXFiles(): boolean {
        const vixFiles = ['VIX.scid', 'VIX.dly', '.VIX.scid', '.VIX.dly'];
        return vixFiles.some(file => fs.existsSync(path.join(this.sierraDataPath, file)));
    }

    /**
     * Tente de lire le prix actuel du VIX depuis les fichiers Sierra Chart
     */
    async getCurrentVIXPrice(): Promise<VIXData | null> {
        try {
            // Chercher les fichiers VIX possibles
            const possibleSymbols = ['VIX', '.VIX'];

            for (const symbol of possibleSymbols) {
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
            }

            // Si aucun fichier VIX trouvé, émettre un warning
            if (!this.checkVIXFiles()) {
                console.log('⚠️ Aucun fichier VIX trouvé dans Sierra Chart.');
                console.log('   Veuillez ajouter le symbole VIX à Sierra Chart:');
                console.log('   1. File > New/Open Chart');
                console.log('   2. Symbol: VIX');
                console.log('   3. Exchange: CBOE');
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur lecture VIX:', error);
            return null;
        }
    }

    /**
     * Lit un fichier SCID (intraday)
     */
    private async readSCIDFile(filePath: string, symbol: string): Promise<VIXData | null> {
        try {
            const buffer = fs.readFileSync(filePath);

            // Vérifier l'en-tête SCID
            if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== 'SCID') {
                return null;
            }

            // Les fichiers SCID ont une structure complexe,
            // nous allons essayer de trouver le dernier prix en cherchant
            // dans les derniers octets du fichier

            // Chercher dans les 1000 derniers octets pour des valeurs de prix plausibles
            const searchBuffer = buffer.slice(Math.max(0, buffer.length - 1000));
            const lastPrice = this.extractLastPrice(searchBuffer);

            if (lastPrice > 0) {
                const change = this.lastPrice > 0 ? lastPrice - this.lastPrice : 0;
                const changePercent = this.lastPrice > 0 ? (change / this.lastPrice) * 100 : 0;

                this.lastPrice = lastPrice;

                return {
                    symbol: symbol,
                    lastPrice: lastPrice,
                    timestamp: new Date(),
                    change: change,
                    changePercent: changePercent,
                    volume: 0,
                    source: 'SierraChart File'
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
    private async readDLYFile(filePath: string, symbol: string): Promise<VIXData | null> {
        try {
            const buffer = fs.readFileSync(filePath);

            // Les fichiers daily sont plus simples et contiennent OHLC par jour
            // Le dernier enregistrement est généralement le jour en cours

            // Chercher dans les 200 derniers octets pour le close du dernier jour
            const searchBuffer = buffer.slice(Math.max(0, buffer.length - 200));

            // Les fichiers daily contiennent généralement: Date, Open, High, Low, Close, Volume
            // Le Close est ce qui nous intéresse pour le prix actuel
            const lastPrice = this.extractLastPrice(searchBuffer);

            if (lastPrice > 0) {
                const change = this.lastPrice > 0 ? lastPrice - this.lastPrice : 0;
                const changePercent = this.lastPrice > 0 ? (change / this.lastPrice) * 100 : 0;

                this.lastPrice = lastPrice;

                return {
                    symbol: symbol,
                    lastPrice: lastPrice,
                    timestamp: new Date(),
                    change: change,
                    changePercent: changePercent,
                    volume: 0,
                    source: 'SierraChart Daily'
                };
            }

            return null;
        } catch (error) {
            console.error(`❌ Erreur lecture ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Extrait le dernier prix depuis un buffer binaire
     */
    private extractLastPrice(buffer: Buffer): number {
        let maxPrice = 0;

        // Chercher des nombres à virgule flottante plausibles (entre 10 et 1000 pour le VIX)
        for (let i = 0; i < buffer.length - 8; i += 4) {
            // Essayer de lire un float (32 bits)
            const value = buffer.readFloatLE(i);

            // VIX typiquement entre 10 et 1000
            if (value >= 10 && value <= 1000 && !isNaN(value) && isFinite(value)) {
                maxPrice = Math.max(maxPrice, value);
            }
        }

        return maxPrice;
    }

    /**
     * Démarre la surveillance continue des fichiers VIX
     */
    startWatching(intervalMs: number = 5000): void {
        console.log(`📊 Démarrage surveillance VIX depuis: ${this.sierraDataPath}`);

        // Vérification immédiate
        this.checkAndEmitVIX();

        // Surveillance périodique
        this.watchInterval = setInterval(() => {
            this.checkAndEmitVIX();
        }, intervalMs);
    }

    /**
     * Arrête la surveillance
     */
    stopWatching(): void {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
            console.log('🔌 Surveillance VIX arrêtée');
        }
    }

    /**
     * Vérifie et émet les données VIX
     */
    private async checkAndEmitVIX(): Promise<void> {
        try {
            const vixData = await this.getCurrentVIXPrice();

            if (vixData) {
                console.log(`📊 VIX (${vixData.source}): ${vixData.lastPrice.toFixed(2)} ${vixData.changePercent >= 0 ? '📈' : '📉'} ${vixData.changePercent >= 0 ? '+' : ''}${vixData.changePercent.toFixed(2)}%`);
                console.log(`   ⏰ ${vixData.timestamp.toLocaleString()}`);
                console.log('   ' + '='.repeat(50));

                this.emit('vixData', vixData);
            } else {
                // Premier échec : donner des instructions
                if (this.lastPrice === 0) {
                    console.log('⚠️ Configuration requise:');
                    console.log('   1. Ouvrez Sierra Chart');
                    console.log('   2. File > New/Open Chart');
                    console.log('   3. Symbol: VIX');
                    console.log('   4. Exchange: CBOE Futures Exchange');
                    console.log('   5. Cliquez sur OK pour ajouter le symbole');
                    console.log('   6. Attendez quelques minutes que les données se chargent');
                }
            }
        } catch (error) {
            console.error('❌ Erreur surveillance VIX:', error);
        }
    }

    /**
     * Vérifie l'état des fichiers
     */
    checkFilesStatus(): void {
        console.log('\n📋 Vérification fichiers VIX:');
        console.log(`   Chemin: ${this.sierraDataPath}`);
        console.log(`   VIX.scid: ${fs.existsSync(path.join(this.sierraDataPath, 'VIX.scid')) ? '✅' : '❌'}`);
        console.log(`   VIX.dly: ${fs.existsSync(path.join(this.sierraDataPath, 'VIX.dly')) ? '✅' : '❌'}`);
        console.log(`   .VIX.scid: ${fs.existsSync(path.join(this.sierraDataPath, '.VIX.scid')) ? '✅' : '❌'}`);
        console.log(`   .VIX.dly: ${fs.existsSync(path.join(this.sierraDataPath, '.VIX.dly')) ? '✅' : '❌'}`);
    }

    /**
     * Statistiques du lecteur
     */
    getStats(): any {
        return {
            dataPath: this.sierraDataPath,
            lastPrice: this.lastPrice,
            hasVIXFiles: this.checkVIXFiles(),
            isWatching: this.watchInterval !== null
        };
    }
}

async function main() {
    const vixReader = new VIXFileReader();

    vixReader.on('vixData', (data: VIXData) => {
        // Info déjà affichée
    });

    try {
        // Afficher le statut des fichiers
        vixReader.checkFilesStatus();

        console.log('\n🚀 Démarrage lecture VIX depuis fichiers Sierra Chart...');

        // Démarrer la surveillance
        vixReader.startWatching(3000); // Vérifier toutes les 3 secondes

        // Test après 10 secondes
        setTimeout(async () => {
            console.log('\n🎯 Test lecture VIX...');
            const vixPrice = await vixReader.getCurrentVIXPrice();
            const stats = vixReader.getStats();

            console.log(`💰 Résultats VIX:
   Prix actuel: ${vixPrice ? vixPrice.lastPrice.toFixed(2) : 'Non disponible'}
   Source: ${vixPrice ? vixPrice.source : 'N/A'}
   Dernière mise à jour: ${vixPrice ? vixPrice.timestamp.toLocaleString() : 'Jamais'}
   Fichiers VIX trouvés: ${stats.hasVIXFiles ? 'Oui' : 'Non'}`);
        }, 10000);

        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt lecture VIX...');
            vixReader.stopWatching();
            process.exit(0);
        });

        console.log('📊 Surveillance VIX active. Attente des données...\n');

    } catch (error) {
        console.error('❌ Erreur fatale VIX:', error);
        process.exit(1);
    }
}

export default VIXFileReader;

if (require.main === module) {
    main();
}