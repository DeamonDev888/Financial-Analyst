import { NewsAggregator } from '../ingestion/NewsAggregator';
import { ToonFormatter } from '../utils/ToonFormatter';

/**
 * SCRIPT: fetch_sentiment_data.ts
 * 
 * Ce script est conçu pour être exécuté en ligne de commande ou par l'agent.
 * Il récupère les news fraîches, les convertit en format TOON optimisé,
 * et affiche le résultat sur la sortie standard (STDOUT).
 * 
 * USAGE PIPELINE:
 * ts-node src/backend/scripts/fetch_sentiment_data.ts > data/input.toon
 * cat data/input.toon | kilocode -m ask ...
 */

async function main() {
    const aggregator = new NewsAggregator();

    // 1. Récupération parallèle des données
    // (On utilise des logs sur STDERR pour ne pas polluer la sortie STDOUT qui servira de prompt)
    console.error('>>> Fetching market news...');

    const [zeroHedge, cnbc, financialJuice] = await Promise.all([
        aggregator.fetchZeroHedgeHeadlines(),
        aggregator.fetchCNBCMarketNews(),
        aggregator.fetchFinancialJuice()
    ]);

    const allNews = [...zeroHedge, ...cnbc, ...financialJuice];
    console.error(`>>> Retrieved ${allNews.length} headlines.`);

    if (allNews.length === 0) {
        console.log("NO_DATA");
        return;
    }

    // 2. Formatage TOON (Sortie pure pour l'IA)
    const toonOutput = ToonFormatter.arrayToToon('market_news', allNews.map(n => ({
        title: n.title.replace(/,/g, ' '), // Nettoyage basique pour le CSV-like du TOON
        source: n.source,
        time: n.timestamp.toISOString().split('T')[1].substring(0, 5) // HH:MM
    })));

    // 3. Injection du contexte système (Optionnel, ou géré par l'agent)
    // Ici on sort juste les données brutes formatées
    console.log(toonOutput);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
