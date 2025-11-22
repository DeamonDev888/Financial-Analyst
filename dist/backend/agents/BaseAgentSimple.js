"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgentSimple = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BaseAgentSimple {
    agentName;
    dataDir;
    constructor(name) {
        this.agentName = name;
        this.dataDir = path.join(process.cwd(), 'data', 'agent-data', name);
    }
    /**
     * Exécute KiloCode avec une approche robuste et simple
     */
    async callKiloCode(req) {
        const fullOutputPath = path.join(process.cwd(), req.outputFile);
        console.log(`[${this.agentName}] Preparing KiloCode execution...`);
        try {
            // Pour les gros prompts, utiliser un fichier temporaire
            if (req.prompt.length > 1000) {
                return await this.executeWithFile(req, fullOutputPath);
            }
            else {
                return await this.executeDirect(req, fullOutputPath);
            }
        }
        catch (error) {
            console.error(`[${this.agentName}] KiloCode execution failed:`, error);
            throw error;
        }
    }
    /**
     * Exécute avec un fichier temporaire
     */
    async executeWithFile(req, fullOutputPath) {
        const tempPromptPath = path.join(process.cwd(), 'temp_prompt.txt');
        await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');
        const command = `cat "${tempPromptPath}" | kilocode -m ask --auto --json`;
        console.log(`[${this.agentName}] Using file-based execution for large prompt (${req.prompt.length} chars)`);
        try {
            const { stdout } = await execAsync(command, {
                timeout: 120000, // 2 minutes
                cwd: process.cwd()
            });
            await fs.writeFile(fullOutputPath, stdout, 'utf-8');
            return this.parseKiloCodeOutput(stdout);
        }
        finally {
            // Nettoyer le fichier temporaire
            try {
                await fs.unlink(tempPromptPath);
                console.log(`[${this.agentName}] Cleaned up temporary file`);
            }
            catch (e) {
                // Ignorer les erreurs de nettoyage
            }
        }
    }
    /**
     * Exécute directement en ligne de commande
     */
    async executeDirect(req, fullOutputPath) {
        const escapedPrompt = req.prompt.replace(/"/g, '\\"');
        let command = `kilocode -m ask --auto --json "${escapedPrompt}"`;
        if (req.inputFile) {
            const fullInputPath = path.join(process.cwd(), req.inputFile);
            command = `cat "${fullInputPath}" | ${command}`;
        }
        console.log(`[${this.agentName}] Executing direct command`);
        const { stdout } = await execAsync(command, {
            timeout: 120000, // 2 minutes
            cwd: process.cwd()
        });
        await fs.writeFile(fullOutputPath, stdout, 'utf-8');
        return this.parseKiloCodeOutput(stdout);
    }
    /**
     * Parse le output KiloCode avec priorité aux metadata
     */
    parseKiloCodeOutput(stdoutData) {
        console.log(`[${this.agentName}] Parsing KiloCode output (${stdoutData.length} chars)`);
        // Parser les lignes NDJSON
        const lines = stdoutData.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            try {
                const event = JSON.parse(line);
                // Priorité absolue: JSON dans metadata (le plus fiable)
                if (event.metadata && (event.metadata.sentiment || event.metadata.score || event.metadata.catalysts)) {
                    console.log(`[${this.agentName}] Found JSON in metadata`);
                    return this.validateAndCleanJson(event.metadata);
                }
                // Deuxième priorité: completion_result content
                if (event.type === 'completion_result' && event.content) {
                    const jsonInContent = this.extractJson(event.content);
                    if (jsonInContent) {
                        console.log(`[${this.agentName}] Found JSON in completion_result`);
                        return this.validateAndCleanJson(jsonInContent);
                    }
                }
                // Troisième priorité: text content (sauf reasoning)
                if (event.type === 'say' && event.say !== 'reasoning' && event.content) {
                    const jsonInContent = this.extractJson(event.content);
                    if (jsonInContent) {
                        console.log(`[${this.agentName}] Found JSON in text content`);
                        return this.validateAndCleanJson(jsonInContent);
                    }
                }
            }
            catch (e) {
                // Ignorer les lignes non-JSON
            }
        }
        // Fallback: chercher JSON dans tout le stdout
        const jsonInStdout = this.extractJson(stdoutData);
        if (jsonInStdout) {
            console.log(`[${this.agentName}] Found JSON in stdout fallback`);
            return this.validateAndCleanJson(jsonInStdout);
        }
        throw new Error('No valid JSON found in KiloCode output');
    }
    /**
     * Extrait le JSON d'un texte
     */
    extractJson(text) {
        // Chercher les objets JSON complets
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch)
            return null;
        try {
            return JSON.parse(jsonMatch[0]);
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Valide et nettoie le JSON pour le SentimentAgent
     */
    validateAndCleanJson(parsed) {
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid JSON structure');
        }
        // Valider les champs requis pour le SentimentAgent
        const hasSentiment = parsed.sentiment && typeof parsed.sentiment === 'string';
        const hasValidSentiment = ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.sentiment?.toUpperCase());
        const hasScore = typeof parsed.score === 'number';
        const hasRiskLevel = ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.risk_level?.toUpperCase());
        const hasCatalysts = Array.isArray(parsed.catalysts);
        const hasSummary = typeof parsed.summary === 'string';
        if (!hasSentiment || !hasValidSentiment || !hasScore || !hasRiskLevel || !hasCatalysts || !hasSummary) {
            console.warn(`[${this.agentName}] JSON structure incomplete, but returning anyway`);
        }
        // Nettoyer et normaliser
        return {
            sentiment: hasValidSentiment ? parsed.sentiment.toUpperCase() : 'NEUTRAL',
            score: hasScore ? parsed.score : 0,
            risk_level: hasRiskLevel ? parsed.risk_level.toUpperCase() : 'MEDIUM',
            catalysts: hasCatalysts ? parsed.catalysts : [],
            summary: hasSummary ? parsed.summary : 'No summary available'
        };
    }
}
exports.BaseAgentSimple = BaseAgentSimple;
