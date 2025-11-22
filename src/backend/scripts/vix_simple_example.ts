import { SierraChartVIXClient, VIXData } from './get_vix_data';

/**
 * Exemple simple d'utilisation pour récupérer les données VIX
 */
async function getVIXSimple() {
    const config = {
        host: 'localhost',
        port: 11099,
        symbol: '.VIX'  // Vous pouvez changer pour 'VIX' si nécessaire
    };

    const client = new SierraChartVIXClient(config);

    return new Promise((resolve, reject) => {
        let vixDataReceived = false;
        let timeout: NodeJS.Timeout;

        // Configuration du timeout après 30 secondes
        timeout = setTimeout(() => {
            if (!vixDataReceived) {
                client.disconnect();
                reject(new Error('Timeout: Aucune donnée VIX reçue après 30 secondes'));
            }
        }, 30000);

        client.on('vixData', (data: VIXData) => {
            if (!vixDataReceived) {
                vixDataReceived = true;
                clearTimeout(timeout);

                console.log('✅ Données VIX reçues avec succès:');
                console.log(`Prix actuel: ${data.lastPrice}`);
                console.log(`Variation: ${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`);
                console.log(`Volume: ${data.volume}`);

                client.disconnect();
                resolve(data);
            }
        });

        client.on('error', (error: Error) => {
            clearTimeout(timeout);
            client.disconnect();
            reject(error);
        });

        client.on('authenticationError', (error: string) => {
            clearTimeout(timeout);
            client.disconnect();
            reject(new Error(`Erreur d'authentification: ${error}`));
        });

        // Démarrer la connexion
        client.connect().catch((error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

/**
 * Fonction pour obtenir juste le prix actuel du VIX
 */
async function getCurrentVIXPrice(): Promise<number> {
    try {
        const vixData = await getVIXSimple() as VIXData;
        return vixData.lastPrice;
    } catch (error) {
        console.error('Erreur lors de la récupération du prix VIX:', error);
        throw error;
    }
}

// Exemple d'utilisation
async function main() {
    console.log('🚀 Démarrage de la récupération des données VIX...');

    try {
        const currentPrice = await getCurrentVIXPrice();
        console.log(`📈 Prix actuel du VIX: ${currentPrice}`);
    } catch (error) {
        console.error('❌ Impossible de récupérer les données VIX:', error);
        console.log('\n💡 Vérifiez que:');
        console.log('1. Sierra Chart fonctionne bien');
        console.log('2. Le serveur DTC écoute sur le port 11099');
        console.log('3. Le symbole VIX est correctement configuré');
        console.log('4. Aucun firewall ne bloque la connexion');
    }
}

export { getVIXSimple, getCurrentVIXPrice };

// Exécuter si appelé directement
if (require.main === module) {
    main();
}