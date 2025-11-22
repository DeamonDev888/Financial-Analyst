import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.join(__dirname, 'src', 'backend', 'database', 'schema.sql');
const OUTPUT_PATH = path.join(__dirname, 'DATABASE_GLOSSARY.md');

// Descriptions manuelles pour enrichir la documentation
const TABLE_DESCRIPTIONS: { [key: string]: string } = {
    'news_items': 'Stocke les articles de news bruts et traités récupérés depuis les sources (ZeroHedge, CNBC, FinancialJuice) ainsi que les indicateurs macro-économiques (FRED). C\'est la source de vérité pour les données d\'entrée.',
    'sentiment_analyses': 'Contient l\'historique des analyses générées par l\'IA. Chaque ligne correspond à une exécution de l\'agent de sentiment.',
    'news_sources': 'Registre des sources de données, leur configuration (URL RSS) et leur état de santé (succès/échec du scraping).',
    'scraping_sessions': 'Logs des sessions de scraping pour le monitoring et le débogage.',
    'market_time_series': 'Données temporelles structurées pour les algorithmes quantitatifs (séries chronologiques de sentiment, volatilité, etc.).',
    'market_patterns': 'Patterns de marché détectés par les algorithmes (ex: divergence sentiment/prix, pics de volatilité).',
    'algorithm_performance': 'Métriques de performance des différents algorithmes et versions pour le backtesting et l\'optimisation.',
};

const VIEW_DESCRIPTIONS: { [key: string]: string } = {
    'latest_news': 'Vue simplifiée des news des 7 derniers jours.',
    'daily_news_summary': 'Agrégation quotidienne des news par source et sentiment.',
    'source_performance': 'Métriques de fiabilité des sources (taux de succès, dernière mise à jour).',
    'news_for_analysis': 'Vue filtrée pour l\'agent : news des 48h dernières heures prêtes pour l\'analyse.',
    'recent_sentiment_analyses': 'Vue des 30 derniers jours d\'analyses avec les métriques clés.',
    'active_market_patterns': 'Patterns actuellement actifs et pertinents.',
    'recent_time_series': 'Données haute fréquence des 24 dernières heures.'
};

function parseSchema(sqlContent: string) {
    const tables: any[] = [];
    const views: any[] = [];

    // Regex pour capturer les tables
    const tableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(([\s\S]*?)\);/g;
    let match;

    while ((match = tableRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const columnsBlock = match[2];
        
        const columns = columnsBlock.split(',\n').map(line => {
            // Regex améliorée pour capturer les types avec virgules (ex: DECIMAL(5,2))
            const colMatch = line.trim().match(/^(\w+)\s+([a-zA-Z0-9_\(\),]+)(.*)$/);
            if (colMatch) {
                return {
                    name: colMatch[1],
                    type: colMatch[2],
                    constraints: colMatch[3].trim().replace(/,$/, '')
                };
            }
            return null;
        }).filter(c => c !== null);

        tables.push({
            name: tableName,
            columns: columns,
            description: TABLE_DESCRIPTIONS[tableName] || 'Table de données.'
        });
    }

    // Regex pour capturer les vues (simplifié)
    const viewRegex = /CREATE OR REPLACE VIEW (\w+) AS([\s\S]*?);/g;
    while ((match = viewRegex.exec(sqlContent)) !== null) {
        const viewName = match[1];
        views.push({
            name: viewName,
            description: VIEW_DESCRIPTIONS[viewName] || 'Vue SQL.'
        });
    }

    return { tables, views };
}

function generateMarkdown(data: { tables: any[], views: any[] }) {
    let md = `# 📚 Glossaire de la Base de Données Financial Analyst\n\n`;
    md += `Ce document détaille la structure de la base de données PostgreSQL utilisée par le système. Il sert de référence pour le développement d'algorithmes et l'analyse de données.\n\n`;
    md += `> **Généré automatiquement** par \`generate_db_glossary.ts\` le ${new Date().toLocaleString()}\n\n`;

    md += `## 🗂️ Tables Principales\n\n`;

    for (const table of data.tables) {
        md += `### \`${table.name}\`\n`;
        md += `${table.description}\n\n`;
        md += `| Colonne | Type | Description / Contraintes |\n`;
        md += `| :--- | :--- | :--- |\n`;
        
        for (const col of table.columns) {
            // Nettoyage des contraintes pour l'affichage
            let constraints = col.constraints
                .replace(/CHECK \((.*?)\)/, 'Valid: `$1`')
                .replace(/DEFAULT (.*?)/, 'Def: `$1`')
                .replace(/NOT NULL/, '**Required**')
                .replace(/PRIMARY KEY/, '🔑 **PK**')
                .replace(/UNIQUE/, 'Unique')
                .replace(/REFERENCES (\w+)\((\w+)\)/, 'Ref: `$1.$2`');

            md += `| **${col.name}** | \`${col.type}\` | ${constraints} |\n`;
        }
        md += `\n---\n\n`;
    }

    md += `## 👁️ Vues (Views)\n\n`;
    md += `Les vues simplifient l'accès aux données pour les agents et les dashboards.\n\n`;

    for (const view of data.views) {
        md += `### \`${view.name}\`\n`;
        md += `${view.description}\n\n`;
    }

    return md;
}

function main() {
    try {
        console.log(`📖 Lecture du schéma depuis: ${SCHEMA_PATH}`);
        if (!fs.existsSync(SCHEMA_PATH)) {
            console.error(`❌ Erreur: Le fichier schéma est introuvable à ${SCHEMA_PATH}`);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        const parsedData = parseSchema(sqlContent);
        const markdown = generateMarkdown(parsedData);

        fs.writeFileSync(OUTPUT_PATH, markdown);
        console.log(`✅ Glossaire généré avec succès: ${OUTPUT_PATH}`);

    } catch (error) {
        console.error("❌ Une erreur est survenue:", error);
    }
}

main();
