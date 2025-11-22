# SentimentAgent Documentation

## 🎯 Overview

Le **SentimentAgentFinal** est le cœur du système **Financial Analyst**. C'est un agent autonome qui orchestre la récupération des données, leur formatage, et l'analyse via l'IA pour produire un sentiment de marché actionnable pour les Futures ES (S&P 500).

## 🏗 Architecture

### Composants Principaux

```
SentimentAgentFinal
├── NewsDatabaseService (Gestion des données & Cache)
│   └── NewsAggregator (Ingestion)
├── ToonFormatter (Optimisation des tokens)
└── KiloCode CLI (Moteur d'inférence AI)
```

### Flux de Données (Pipeline)

1.  **Check Cache** : L'agent demande à `NewsDatabaseService` si les données récentes (< 2h) existent.
2.  **Ingestion (si nécessaire)** : Si le cache est vide ou expiré, `NewsAggregator` est appelé pour scraper les sources et remplir la DB.
3.  **Retrieval** : L'agent récupère les news des dernières 48h depuis PostgreSQL.
4.  **Formatting** : Les news sont converties en format **TOON** via `ToonFormatter` pour minimiser la consommation de tokens.
5.  **Inference** : Un prompt structuré est envoyé à `x-ai/grok-code-fast-1` via le CLI `kilocode`.
6.  **Result** : La réponse JSON est parsée, validée, affichée et stockée en DB.

## 🚀 Fonctionnalités

### 🧠 Analyse de Sentiment IA

L'agent utilise le modèle **KiloCode (x-ai/grok-code-fast-1)** pour générer :

- **Sentiment** : `BULLISH`, `BEARISH`, ou `NEUTRAL`.
- **Score** : De -100 (Extrême Peur) à +100 (Extrême Euphorie).
- **Risk Level** : `LOW`, `MEDIUM`, `HIGH`.
- **Catalysts** : Liste des 3 principaux drivers de marché identifiés.
- **Summary** : Résumé concis de la situation.

### 🛡️ Robustesse ("No Fallback Policy")

Contrairement aux versions précédentes, cet agent est conçu pour être **strict** :

- Si la base de données est inaccessible -> Erreur (Pas de mode dégradé sans mémoire).
- Si l'IA échoue -> Retourne un objet "N/A" structuré, ne devine pas.
- Timeout strict de 60 secondes pour l'analyse.

## 📋 Utilisation

### Commandes Principales

```bash
# Analyse ponctuelle (One-shot)
npm run analyze

# Monitoring continu (Boucle infinie, toutes les 5 min)
npm run continuous

# Vérifier l'état du système (DB, Cache, News count)
npm run status
```

### Exemple de Résultat Console

```text
📈 MARKET SENTIMENT RESULT:
{
  "sentiment": "BEARISH",
  "score": -45,
  "risk_level": "HIGH",
  "catalysts": [
    "Bitcoin slide threatening $80,000 break",
    "AI CapEx masking economic weakness",
    "Geopolitical tensions"
  ],
  "summary": "Mixed headlines with strong bearish signals...",
  "data_source": "database_cache",
  "news_count": 22,
  "analysis_method": "robust_kilocode_v2"
}
```

## 🔧 Configuration

### Variables d'Environnement (`.env`)

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_analyst
DB_USER=postgres
DB_PASSWORD=****
```

### Paramètres Internes

- **Modèle AI** : `x-ai/grok-code-fast-1` (Hardcodé dans le prompt system).
- **Fenêtre d'analyse** : 48 heures (Les news plus anciennes sont ignorées pour l'analyse immédiate).
- **Cache TTL** : 2 heures.

## 📊 Monitoring & Debug

### Fichier Tampon (`database.md`)

À chaque analyse, l'agent génère un fichier `database.md` à la racine. Ce fichier contient exactement ce qui a été envoyé à l'IA (le prompt + les données TOON). C'est essentiel pour comprendre pourquoi l'IA a donné une certaine réponse.

### Logs

L'agent utilise `console.log` et `console.error` avec des emojis pour une lisibilité immédiate dans le terminal.

## 📚 Ressources Complémentaires

- [NEWS_DATA_SYSTEM.md](NEWS_DATA_SYSTEM.md) - Détails sur l'ingestion.
- [DATABASE_CACHE_SYSTEM.md](DATABASE_CACHE_SYSTEM.md) - Détails sur le stockage.
