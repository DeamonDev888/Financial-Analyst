# Système de Traitement des Données de Marché

## 🎯 Objectif

Le système de traitement des données de marché nettoie, organise et classe les nouvelles financières par jour et heure pour faciliter l'analyse et la prise de décision de trading.

## 🏗️ Architecture

### Composants Principaux

1. **NewsAggregator** - Scraping des 3 sources de données
   - ZeroHedge (RSS)
   - CNBC (RSS)
   - FinancialJuice (Simulation)

2. **NewsDataProcessor** - Nettoyage et classification
   - Nettoyage des titres
   - Extraction de mots-clés
   - Classification par jour/heure
   - Détermination des heures de marché

3. **NewsDataManager** - Gestion et analyse
   - Rapports d'analyse
   - Export CSV
   - Statistiques de marché

## 🚀 Utilisation

### Pipeline Complet

```bash
# Exécuter le pipeline complet (scraping + traitement)
npm run pipeline
```

### Analyse des Données

```bash
# Analyse de la dernière semaine
npm run analyze:week

# Analyse du dernier mois
npm run analyze:month

# Résumé du jour
npm run data:today

# Voir les dates disponibles
npm run data:dates

# Exporter en CSV (dernière semaine)
npm run export:csv

# Exporter une période personnalisée
npm run analyze export 2024-01-01 2024-01-31
```

### Agent de Sentiment

```bash
# Lancer l'analyse de sentiment avec les nouvelles traitées
npm run sentiment
```

## 📊 Structure des Données

### Format des Données Traitées

Chaque nouvelle est traitée avec les informations suivantes :

```typescript
interface ProcessedNewsData {
    date: string;           // YYYY-MM-DD
    hour: string;           // HH:00
    timestamp: Date;
    source: string;         // ZeroHedge, CNBC, FinancialJuice
    title: string;          // Titre nettoyé
    url: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    keywords: string[];     // Mots-clés pertinents
    market_hours: 'pre-market' | 'market' | 'after-hours' | 'extended';
}
```

### Classification par Heures de Marché

- **Pre-market**: 4:00-9:30 EST
- **Market**: 9:30-16:00 EST
- **After-hours**: 16:00-20:00 EST
- **Extended**: Le reste du temps

### Mots-clés Extraits

Le système extrait automatiquement les mots-clés pertinents :

- **Politique monétaire**: fed, rates, inflation, cpi, powell
- **Indices**: s&p, nasdaq, dow, futures, volatility
- **Secteurs**: tech, energy, financials, healthcare
- **Actions de marché**: rally, sell-off, bull, bear, volatile
- **Entreprises**: apple, microsoft, google, amazon, tesla

## 📁 Organisation des Fichiers

```
data/
├── processed-news/              # Données traitées par jour
│   ├── news_2024-01-15.json    # Données du 15 janvier 2024
│   ├── news_2024-01-14.json    # Données du 14 janvier 2024
│   └── all_news.json           # Toutes les données consolidées
├── exports/                    # Exports CSV
│   └── news_2024-01-01_to_2024-01-31.csv
└── agent-data/                 # Données pour les agents AI
    └── sentiment-agent/
```

## 📈 Rapports d'Analyse

### Rapport Hebdomadaire/Mensuel

Le système génère des rapports complets incluant :

- **Sentiment global**: Pourcentage bullish/bearish/neutral
- **Activité de marché**: Nombre de nouvelles, heures de pointe
- **Tendances**: Mots-clés les plus fréquents, sources principales
- **Distribution temporelle**: Répartition par heures de marché
- **Breakdown quotidien**: Évolution jour par jour

### Export CSV

Pour analyse externe (Excel, Python, etc.) :

```bash
npm run analyze export 2024-01-01 2024-01-31 ./exports/market_data.csv
```

Format CSV :
- Date, Heure, Source, Titre, Sentiment, HeuresMarché, Mots-clés

## 🔧 Personnalisation

### Ajouter des Sources de Données

Pour ajouter une nouvelle source, modifier `NewsAggregator.ts` :

```typescript
async fetchNewSource(): Promise<NewsItem[]> {
    // Implémentation du scraping
}
```

### Mots-clés Personnalisés

Modifier `NewsDataProcessor.ts` pour ajouter des mots-clés spécifiques :

```typescript
private extractKeywords(title: string): string[] {
    const marketKeywords = [
        // Ajouter vos mots-clés personnalisés ici
    ];
}
```

### Analyse Personnalisée

Créer des scripts personnalisés en utilisant `NewsDataManager` :

```typescript
const dataManager = new NewsDataManager();
const report = await dataManager.generateAnalysisReport('2024-01-01', '2024-01-31');
```

## ⚡ Performance

- **Temps de traitement**: ~10-30 secondes pour le pipeline complet
- **Sources**: 3 sources parallélisées
- **Nettoyage**: Algorithmes optimisés pour éviter les doublons
- **Stockage**: Format JSON compressé pour accès rapide

## 🛠️ Dépannage

### Problèmes Communs

1. **Pas de données disponibles**
   ```bash
   npm run data:dates  # Vérifier les dates disponibles
   ```

2. **Erreurs de scraping**
   - Vérifier la connexion internet
   - Les flux RSS peuvent être temporairement indisponibles

3. **Mémoire insuffisante**
   - Limiter la période d'analyse
   - Exporter par périodes plus courtes

### Logs et Débogage

Les logs détaillés sont affichés lors de l'exécution :

```bash
DEBUG=* npm run pipeline  # Logs détaillés
```

## 📚 API Référence

### NewsDataProcessor

- `processNews(newsItems: NewsItem[])` - Traite les nouvelles brutes
- `saveProcessedNews(data: ProcessedNewsData[])` - Sauvegarde les données
- `loadDailyData(date: string)` - Charge les données d'un jour spécifique
- `getAvailableDates()` - Retourne les dates disponibles

### NewsDataManager

- `runDailyNewsPipeline()` - Exécute le pipeline complet
- `generateAnalysisReport(startDate, endDate)` - Génère un rapport
- `exportToCSV(startDate, endDate, outputPath?)` - Export en CSV

---

*Ce système facilite l'analyse des données de marché pour une prise de décision éclairée en trading.*