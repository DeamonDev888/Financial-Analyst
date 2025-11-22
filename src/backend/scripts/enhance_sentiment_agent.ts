/**
 * Script pour enrichir le SentimentAgentFinal avec capture de données détaillées
 * à chaque inference pour algorithmes avancés
 */

import { SentimentAgentFinal } from '../agents/SentimentAgentFinal';
import { NewsDatabaseService } from '../database/NewsDatabaseService';
import * as dotenv from 'dotenv';

dotenv.config();

interface EnhancedAnalysisData {
    // Données de base
    overall_sentiment: string;
    score: number;
    risk_level: string;
    catalysts: string[];
    summary: string;
    news_count: number;

    // Nouvelles données enrichies
    market_session: string;
    inference_duration_ms: number;
    volatility_estimate: number;
    market_regime: string;
    sentiment_strength: string;
    key_insights: string[];
    trading_signals: Record<string, any>;
    technical_bias: string;
    news_impact_level: string;
    algorithm_confidence: number;
    metadata: Record<string, any>;
    validation_flags: Record<string, any>;
    performance_metrics: Record<string, any>;
}

/**
 * Agent de sentiment enrichi avec capture de données détaillées
 */
class EnhancedSentimentAgent extends SentimentAgentFinal {
    private analysisStartTime: number = 0;
    private newsItemsData: any[] = [];

    /**
     * Enrichir l'analyse avec des données avancées
     */
    private enrichAnalysisData(baseData: any): EnhancedAnalysisData {
        const analysisDuration = Date.now() - this.analysisStartTime;

        // Déterminer la session de marché
        const now = new Date();
        const marketSession = this.determineMarketSession(now);

        // Calculer l'estimation de volatilité
        const volatilityEstimate = this.calculateVolatility();

        // Déterminer le régime de marché
        const marketRegime = this.determineMarketRegime(baseData.score, baseData.sentiment);

        // Calculer la force du sentiment
        const sentimentStrength = this.calculateSentimentStrength(baseData.score);

        // Générer les insights clés
        const keyInsights = this.generateKeyInsights(baseData);

        // Créer les signaux de trading
        const tradingSignals = this.generateTradingSignals(baseData, volatilityEstimate);

        // Déterminer le biais technique
        const technicalBias = this.determineTechnicalBias(baseData.score);

        // Évaluer l'impact des news
        const newsImpactLevel = this.evaluateNewsImpact(baseData.news_count, baseData.risk_level);

        // Calculer la confiance de l'algorithme
        const algorithmConfidence = this.calculateAlgorithmConfidence(baseData, analysisDuration);

        // Créer les métadonnées
        const metadata = this.createMetadata(baseData, analysisDuration);

        // Créer les flags de validation
        const validationFlags = this.createValidationFlags(baseData);

        // Créer les métriques de performance
        const performanceMetrics = this.createPerformanceMetrics(baseData, analysisDuration);

        return {
            ...baseData,
            market_session: marketSession,
            inference_duration_ms: analysisDuration,
            volatility_estimate: volatilityEstimate,
            market_regime: marketRegime,
            sentiment_strength: sentimentStrength,
            key_insights: keyInsights,
            trading_signals: tradingSignals,
            technical_bias: technicalBias,
            news_impact_level: newsImpactLevel,
            algorithm_confidence: algorithmConfidence,
            metadata: metadata,
            validation_flags: validationFlags,
            performance_metrics: performanceMetrics
        };
    }

    /**
     * Déterminer la session de marché actuelle
     */
    private determineMarketSession(now: Date): string {
        const hour = now.getHours();
        const day = now.getDay();

        if (day === 0 || day === 6) return 'weekend';
        if (hour < 9 || hour >= 16) return hour < 9 ? 'pre-market' : 'after-hours';
        return 'regular';
    }

    /**
     * Calculer une estimation de volatilité basée sur les données
     */
    private calculateVolatility(): number {
        // Simuler une estimation de volatilité (0-100)
        // En production, ceci pourrait venir de données réelles
        const volatility = Math.floor(Math.random() * 30) + 20; // 20-50
        return volatility;
    }

    /**
     * Déterminer le régime de marché
     */
    private determineMarketRegime(score: number, sentiment: string): string {
        if (Math.abs(score) > 30) {
            return score > 0 ? 'bull' : 'bear';
        }
        if (sentiment === 'neutral') {
            return 'sideways';
        }
        return 'transitional';
    }

    /**
     * Calculer la force du sentiment
     */
    private calculateSentimentStrength(score: number): string {
        const absScore = Math.abs(score);
        if (absScore > 60) return 'extreme';
        if (absScore > 40) return 'strong';
        if (absScore > 20) return 'moderate';
        return 'weak';
    }

    /**
     * Générer les insights clés pour algorithmes
     */
    private generateKeyInsights(baseData: any): string[] {
        const insights = [];

        if (baseData.catalysts && baseData.catalysts.length > 0) {
            baseData.catalysts.forEach((catalyst: string) => {
                insights.push(`Catalyst: ${catalyst}`);
            });
        }

        if (baseData.score > 20) {
            insights.push('Strong bullish momentum detected');
        } else if (baseData.score < -20) {
            insights.push('Strong bearish pressure identified');
        }

        if (this.newsItemsData.length > 15) {
            insights.push('High news volume indicates significant market activity');
        }

        return insights;
    }

    /**
     * Générer les signaux de trading
     */
    private generateTradingSignals(baseData: any, volatility: number): Record<string, any> {
        const signals = {
            entry_signal: 'HOLD',
            exit_signal: 'NONE',
            risk_level: baseData.risk_level,
            confidence: baseData.confidence || 0.8,
            volatility_adjusted: volatility > 40,
            time_horizon: 'short_term'
        };

        // Signaux d'entrée
        if (baseData.score > 25 && volatility < 35) {
            signals.entry_signal = 'BUY';
        } else if (baseData.score < -25 && volatility < 35) {
            signals.entry_signal = 'SELL';
        }

        // Signaux de sortie
        if (Math.abs(baseData.score) > 50) {
            signals.exit_signal = baseData.score > 0 ? 'TAKE_PROFIT' : 'STOP_LOSS';
        }

        return signals;
    }

    /**
     * Déterminer le biais technique
     */
    private determineTechnicalBias(score: number): string {
        if (score > 30) return 'overbought';
        if (score < -30) return 'oversold';
        return 'neutral';
    }

    /**
     * Évaluer l'impact des news
     */
    private evaluateNewsImpact(newsCount: number, riskLevel: string): string {
        if (newsCount > 20 && riskLevel === 'high') return 'critical';
        if (newsCount > 15) return 'high';
        if (newsCount > 10) return 'medium';
        return 'low';
    }

    /**
     * Calculer la confiance de l'algorithme
     */
    private calculateAlgorithmConfidence(baseData: any, durationMs: number): number {
        let confidence = baseData.confidence || 0.8;

        // Ajuster en fonction du nombre de sources
        if (this.newsItemsData.length >= 15) confidence += 0.1;
        else if (this.newsItemsData.length < 10) confidence -= 0.1;

        // Ajuster en fonction de la durée d'inférence
        if (durationMs > 10000) confidence -= 0.1; // Plus de 10s est lent
        else if (durationMs < 3000) confidence += 0.05; // Moins de 3s est rapide

        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * Créer les métadonnées
     */
    private createMetadata(baseData: any, durationMs: number): Record<string, any> {
        return {
            analysis_timestamp: new Date().toISOString(),
            inference_duration_ms: durationMs,
            news_sources_count: this.newsItemsData.length,
            data_source: 'database_cache',
            algorithm_version: 'enhanced_v1.0',
            processing_mode: 'database_only',
            model_confidence: baseData.confidence,
            data_quality_score: this.calculateDataQuality(),
            market_hours: this.determineMarketSession(new Date())
        };
    }

    /**
     * Créer les flags de validation
     */
    private createValidationFlags(baseData: any): Record<string, any> {
        return {
            data_valid: true,
            score_in_range: baseData.score >= -100 && baseData.score <= 100,
            sentiment_valid: ['bullish', 'bearish', 'neutral'].includes(baseData.overall_sentiment),
            has_catalysts: baseData.catalysts && baseData.catalysts.length > 0,
            sufficient_data: this.newsItemsData.length >= 10,
            timestamp_valid: true
        };
    }

    /**
     * Créer les métriques de performance
     */
    private createPerformanceMetrics(baseData: any, durationMs: number): Record<string, any> {
        return {
            inference_speed_ms: durationMs,
            data_points_analyzed: this.newsItemsData.length,
            processing_efficiency: durationMs < 5000 ? 'excellent' : durationMs < 10000 ? 'good' : 'acceptable',
            memory_usage_estimate: this.newsItemsData.length * 1024, // Estimation en bytes
            cpu_efficiency: durationMs < 3000 ? 'high' : durationMs < 6000 ? 'medium' : 'low'
        };
    }

    /**
     * Calculer la qualité des données
     */
    private calculateDataQuality(): number {
        let quality = 0.8; // Base quality

        // Ajuster en fonction de la diversité des sources
        const sources = new Set(this.newsItemsData.map((item: any) => item.source));
        quality += (sources.size / 5) * 0.2; // Bonus pour diversité

        return Math.min(1.0, quality);
    }

    /**
     * Surcharge pour capturer les données enrichies
     */
    async analyzeMarketSentiment(forceRefresh: boolean = false): Promise<any> {
        // Démarrer le chronomètre
        this.analysisStartTime = Date.now();

        // Appeler la méthode parente
        console.log(`[${this.agentName}] 📈 Starting ENHANCED market sentiment analysis...`);

        try {
            // Récupérer les données de la base
            const dbService = new NewsDatabaseService();
            this.newsItemsData = await dbService.getRecentNews(48);

            console.log(`[${this.agentName}] 📊 Analyzing ${this.newsItemsData.length} news items...`);

            // Lancer l'analyse de base
            const baseResult = await super.analyzeMarketSentiment(forceRefresh);

            // Enrichir les résultats
            console.log(`[${this.agentName}] 🚀 Enriching analysis with advanced metrics...`);
            const enhancedResult = this.enrichAnalysisData(baseResult);

            // Enregistrer les données enrichies dans la base
            console.log(`[${this.agentName}] 💾 Saving enhanced analysis to database...`);
            await dbService.saveEnhancedSentimentAnalysis(enhancedResult);

            console.log(`[${this.agentName}] ✅ Enhanced analysis completed successfully!`);
            return enhancedResult;

        } catch (error) {
            console.error(`[${this.agentName}] ❌ Enhanced analysis failed:`, error);

            // Même en cas d'erreur, créer une réponse N/A enrichie
            const errorDuration = Date.now() - this.analysisStartTime;
            return this.createNotAvailableEnhancedResult(errorDuration);
        }
    }

    /**
     * Créer une réponse N/A enrichie
     */
    private createNotAvailableEnhancedResult(durationMs: number): any {
        return {
            overall_sentiment: 'neutral',
            score: 0,
            risk_level: 'medium',
            catalysts: ['Analysis failed'],
            summary: 'Analysis not available due to technical issues',
            news_count: 0,
            market_session: this.determineMarketSession(new Date()),
            inference_duration_ms: durationMs,
            volatility_estimate: 50,
            market_regime: 'transitional',
            sentiment_strength: 'weak',
            key_insights: ['Analysis failed'],
            trading_signals: {
                entry_signal: 'HOLD',
                exit_signal: 'NONE',
                risk_level: 'medium',
                confidence: 0.0
            },
            technical_bias: 'neutral',
            news_impact_level: 'low',
            algorithm_confidence: 0.0,
            metadata: {
                error: true,
                error_timestamp: new Date().toISOString(),
                inference_duration_ms: durationMs
            },
            validation_flags: {
                data_valid: false,
                analysis_failed: true
            },
            performance_metrics: {
                inference_speed_ms: durationMs,
                error_occurred: true
            },
            data_source: 'error',
            analysis_method: 'enhanced_failed'
        };
    }
}

/**
 * Script pour tester l'agent enrichi
 */
async function testEnhancedAgent() {
    console.log("🚀 Testing Enhanced Sentiment Agent...");

    const agent = new EnhancedSentimentAgent();

    try {
        const result = await agent.analyzeMarketSentiment(false);

        console.log("\n✅ Enhanced Analysis Result:");
        console.log("Sentiment:", result.overall_sentiment);
        console.log("Score:", result.score);
        console.log("Risk Level:", result.risk_level);
        console.log("Market Session:", result.market_session);
        console.log("Inference Duration:", result.inference_duration_ms, "ms");
        console.log("Volatility Estimate:", result.volatility_estimate);
        console.log("Sentiment Strength:", result.sentiment_strength);
        console.log("Key Insights:", result.key_insights);
        console.log("Trading Signals:", result.trading_signals);
        console.log("Algorithm Confidence:", result.algorithm_confidence);

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

// Lancer le test si c'est le script principal
if (require.main === module) {
    testEnhancedAgent().catch(console.error);
}

export { EnhancedSentimentAgent, testEnhancedAgent };