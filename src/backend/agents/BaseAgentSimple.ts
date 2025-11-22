import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface AgentRequest {
    prompt: string;
    inputFile?: string;
    outputFile: string;
    context?: any;
}

export abstract class BaseAgentSimple {
    protected agentName: string;
    protected dataDir: string;

    constructor(name: string) {
        this.agentName = name;
        this.dataDir = path.join(process.cwd(), 'data', 'agent-data', name);
    }

    /**
     * Exécute KiloCode avec une approche robuste et simple
     */
    protected async callKiloCode(req: AgentRequest): Promise<any> {
        const fullOutputPath = path.join(process.cwd(), req.outputFile);

        console.log(`[${this.agentName}] Preparing KiloCode execution...`);

        try {
            // Pour les gros prompts, utiliser un fichier temporaire
            if (req.prompt.length > 1000) {
                return await this.executeWithFile(req, fullOutputPath);
            } else {
                return await this.executeDirect(req, fullOutputPath);
            }
        } catch (error) {
            console.error(`[${this.agentName}] KiloCode execution failed:`, error);
            throw error;
        }
    }

    /**
     * Exécute avec un fichier temporaire
     */
    private async executeWithFile(req: AgentRequest, fullOutputPath: string): Promise<any> {
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
        } finally {
            // Nettoyer le fichier temporaire
            try {
                await fs.unlink(tempPromptPath);
                console.log(`[${this.agentName}] Cleaned up temporary file`);
            } catch (e) {
                // Ignorer les erreurs de nettoyage
            }
        }
    }

    /**
     * Exécute directement en ligne de commande
     */
    private async executeDirect(req: AgentRequest, fullOutputPath: string): Promise<any> {
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
    private parseKiloCodeOutput(stdoutData: string): any {
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
            } catch (e) {
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
    private extractJson(text: string): any {
        // Chercher les objets JSON complets
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) return null;

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            return null;
        }
    }

    /**
     * Valide et nettoie le JSON pour le SentimentAgent
     */
    private validateAndCleanJson(parsed: any): any {
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