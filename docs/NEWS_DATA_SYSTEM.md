# Système de Données de Marché (News Data System)

## 🎯 Objectif

Le système de données de marché est responsable de l'ingestion, du nettoyage, du stockage et de la récupération des nouvelles financières. Il alimente le `SentimentAgentFinal` en données fraîches et pertinentes pour l'analyse de sentiment.

## 🏗️ Architecture Actuelle

### Composants Principaux

1.  **NewsAggregator** (`src/backend/ingestion/NewsAggregator.ts`)

    - **Rôle** : Collecte les données brutes depuis les sources externes.
    - **Sources** :
      - **ZeroHedge** (RSS) : News macro et contrarian.
      - **CNBC** (RSS) : News financières mainstream.
      - **FinancialJuice** (Simulation/API) : Headlines temps réel.
    - **Fonctionnement** : Scrape, normalise et retourne une liste d'objets `NewsItem`.

2.  **NewsDatabaseService** (`src/backend/database/NewsDatabaseService.ts`)
    - **Rôle** : Gestionnaire de persistance et de cache.
    - **Fonctionnalités** :
      - **Deduplication** : Utilise un hash unique (MD5 du titre + source) pour éviter les doublons.
      - **Caching** : Vérifie la fraîcheur des données (TTL configurable, défaut 2h).
      - **Nettoyage** : Supprime automatiquement les news obsolètes (> 30 jours).
    - **Stockage** : Table `news_items` dans PostgreSQL.

### Flux de Données

```mermaid
graph LR
    A[Sources Externes] -->|RSS/API| B(NewsAggregator)
    B -->|NewsItem[]| C{NewsDatabaseService}
    C -->|Check Hash| D[PostgreSQL DB]
    D -->|Stored News| E[SentimentAgentFinal]
```

## 🚀 Utilisation

### Ingestion Manuelle

Pour forcer une mise à jour des données sans lancer d'analyse :

```bash
# Via le script de test/maintenance (si disponible) ou via l'agent
npm run status
```

L'ingestion est principalement déclenchée automatiquement par `SentimentAgentFinal` lors d'une analyse si le cache est expiré.

### Accès aux Données

Les données sont stockées dans la table `news_items`.

```sql
-- Exemple de requête pour voir les dernières news
SELECT title, source, published_at
FROM news_items
ORDER BY published_at DESC
LIMIT 10;
```

## 📊 Structure des Données

### Interface `NewsItem`

```typescript
interface NewsItem {
  title: string;
  url: string;
  source: string;
  published_at: string; // ISO Date
  summary?: string;
}
```

### Schéma Base de Données (`news_items`)

| Colonne        | Type      | Description                        |
| :------------- | :-------- | :--------------------------------- |
| `id`           | UUID      | Clé primaire                       |
| `title`        | TEXT      | Titre de la news                   |
| `url`          | TEXT      | Lien original                      |
| `source`       | TEXT      | Nom de la source (ex: 'ZeroHedge') |
| `published_at` | TIMESTAMP | Date de publication                |
| `created_at`   | TIMESTAMP | Date d'insertion en DB             |
| `hash`         | VARCHAR   | Hash unique pour déduplication     |

## 🔧 Configuration

Les paramètres sont définis dans `NewsAggregator.ts` et `NewsDatabaseService.ts` ou via `.env`.

- **Sources RSS** : Configurées en dur dans `NewsAggregator`.
- **TTL Cache** : Défini dans `SentimentAgentFinal` (défaut: 2 heures).

## 🛠️ Dépannage

- **Pas de news ?** : Vérifiez votre connexion internet et l'accès aux flux RSS (ZeroHedge bloque parfois les IPs datacenter).
- **Doublons ?** : Le système de hash devrait les empêcher. Vérifiez si les titres varient légèrement.
