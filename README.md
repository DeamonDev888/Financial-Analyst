# NovaQuote Financial Analyst

An autonomous AI agent system designed to analyze financial markets (ES Futures) by aggregating news, macro data, and sentiment analysis.

## 🚀 Features

- **Multi-Source Ingestion:**
  - **News:** ZeroHedge (RSS), CNBC (RSS), FinancialJuice (Simulated), Finnhub (API).
  - **Macro Economics:** FRED (Federal Reserve Economic Data) - Yield Curve, Inflation, GDP, Unemployment.
- **Robust Architecture:**
  - **Database-First:** All data is stored in PostgreSQL before analysis (Idempotency & History).
  - **AI Analysis:** Uses `kilocode` (LLM) to analyze sentiment, identify catalysts, and assess risk.
  - **Resilience:** Handles API failures and network issues gracefully.

## 🛠️ Setup

1.  **Prerequisites:** Node.js, PostgreSQL.
2.  **Environment Variables:**
    Create a `.env` file with:
    ```env
    DATABASE_URL=postgresql://user:password@localhost:5432/financial_analyst
    FRED_API_KEY=your_fred_api_key
    FINNHUB_API_KEY=your_finnhub_api_key
    ```
3.  **Install Dependencies:**
    ```bash
    npm install
    ```

## 🏃‍♂️ Usage

### 1. Data Ingestion (Refresh)

Fetches the latest news and macro data from all sources and saves them to the database.

```bash
npm run refresh
# Force refresh (ignore cache timers)
npm run refresh -- --force
```

### 2. Sentiment Analysis

Analyzes the data stored in the database to generate a market outlook.

```bash
npm run analyze
```

### 3. Continuous Mode

Runs the ingestion and analysis loop automatically.

```bash
npm run start
```

## 📊 Data Sources Status

| Source             | Type       | Status     | Description                                 |
| :----------------- | :--------- | :--------- | :------------------------------------------ |
| **ZeroHedge**      | News       | ✅ Active  | Geopolitics & Market Contrarian views (RSS) |
| **CNBC**           | News       | ✅ Active  | Mainstream Market News (RSS)                |
| **FinancialJuice** | News       | ✅ Active  | Real-time Headlines (Simulated)             |
| **Finnhub**        | News       | ✅ Active  | General Market News (API)                   |
| **FRED**           | Macro      | ✅ Active  | US Economy (Yields, CPI, GDP, etc.)         |
| **CME / VIX**      | Volatility | ❌ Removed | Removed by user request                     |
| **Investing.com**  | Fed Rates  | ❌ Removed | Removed by user request                     |

## 🏗️ Architecture

1.  **Ingestion Layer (`NewsAggregator`):** Fetches raw data.
2.  **Storage Layer (`NewsDatabaseService`):** PostgreSQL with `ON CONFLICT` deduplication.
3.  **Analysis Layer (`SentimentAgentFinal`):** Reads from DB, prompts LLM, stores results.
4.  **Orchestration (`run.ts`):** Manages the lifecycle.

## 📝 License

Proprietary - NovaQuote System
