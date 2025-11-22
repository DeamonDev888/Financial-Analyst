import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface AgentRequest {
    prompt: string;
    inputFile?: string; // Chemin relatif vers data/
    outputFile: string; // Chemin relatif vers data/
    context?: any;
}

export abstract class BaseAgent {
    protected agentName: string;
    protected dataDir: string;

    constructor(name: string) {
        this.agentName = name;
        this.dataDir = path.join(process.cwd(), 'data', 'agent-data', name);
    }

    /**
     * Exécute une requête KiloCode via le CLI avec gestion robuste des prompts
     */
    protected async callKiloCode(req: AgentRequest): Promise<any> {
        const fullOutputPath = path.join(process.cwd(), req.outputFile);

        console.log(`[${this.agentName}] Preparing KiloCode execution...`);

        try {
            // Pour les gros prompts, on utilise un fichier temporaire pour éviter les limites de ligne de commande
            if (req.prompt.length > 1000) {
                return await this.callKiloCodeWithFile(req, fullOutputPath);
            } else {
                return await this.callKiloCodeDirect(req, fullOutputPath);
            }
        } catch (error) {
            console.error(`[${this.agentName}] KiloCode execution failed:`, error);
            throw error;
        }
    }

    /**
     * Exécute KiloCode avec un fichier temporaire (pour les gros prompts)
     */
    private async callKiloCodeWithFile(req: AgentRequest, fullOutputPath: string): Promise<any> {
        // Créer un fichier temporaire avec le prompt
        const tempPromptPath = path.join(process.cwd(), 'temp_prompt.txt');
        await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');

        console.log(`[${this.agentName}] Using file-based execution for large prompt (${req.prompt.length} chars)`);

        const command = `type "${tempPromptPath}" | kilocode -m ask --auto --json`;
        console.log(`[${this.agentName}] Executing: ${command}`);

        return new Promise((resolve, reject) => {
            const child = require('child_process').spawn(command, {
                shell: true,
                cwd: process.cwd()
            });

            return this.handleChildProcess(child, fullOutputPath, resolve, reject, tempPromptPath);
        });
    }

    /**
     * Exécute KiloCode directement en ligne de commande (pour les petits prompts)
     */
    private async callKiloCodeDirect(req: AgentRequest, fullOutputPath: string): Promise<any> {
        const escapedPrompt = req.prompt.replace(/"/g, '\\"');
        const command = `kilocode -m ask --auto --json "${escapedPrompt}"`;

        // Gestion du pipeline d'entrée si nécessaire
        let fullCommand = command;
        if (req.inputFile) {
            const fullInputPath = path.join(process.cwd(), req.inputFile);
            fullCommand = `type "${fullInputPath}" | ${command}`;
        }

        console.log(`[${this.agentName}] Executing: ${fullCommand}`);

        return new Promise((resolve, reject) => {
            const child = require('child_process').spawn(fullCommand, {
                shell: true,
                cwd: process.cwd()
            });

            return this.handleChildProcess(child, fullOutputPath, resolve, reject);
        });
    }

    /**
     * Gère le processus enfant KiloCode
     */
    private handleChildProcess(child: any, fullOutputPath: string, resolve: Function, reject: Function, tempFile?: string): void {

            let stdoutData = '';
            let stderrData = '';

            child.stdout.on('data', (chunk: any) => {
                stdoutData += chunk.toString();
            });

            child.stderr.on('data', (chunk: any) => {
                stderrData += chunk.toString();
            });

            child.on('close', async (code: number) => {
                // Si on a capturé une réponse (stdoutData), on ignore le code de sortie (car on a peut-être tué le processus)
                if (code !== 0 && !stdoutData) {
                    console.error(`[${this.agentName}] AI Process exited with code ${code}`);
                    console.error(`[${this.agentName}] Stderr:`, stderrData);
                    return reject(new Error(`AI Process failed with code ${code}`));
                }

                if (!stdoutData) {
                    return reject(new Error("Empty output from AI"));
                }

                try {
                    // Sauvegarde pour debug
                    await fs.writeFile(fullOutputPath, stdoutData, 'utf-8');

                    // Parsing robuste du flux NDJSON
                    const lines = stdoutData.split('\n').filter((line: string) => line.trim() !== '');
                    let fullResponse = '';
                    let jsonCandidate = '';
                    let hasValidJson = false;

                    console.log(`[${this.agentName}] Parsing ${lines.length} NDJSON lines...`);

                    for (const line of lines) {
                        try {
                            const event = JSON.parse(line);

                            // 1. Priorité absolue: JSON direct dans metadata (cas le plus fiable)
                            if (event.metadata && (event.metadata.sentiment || event.metadata.score || event.metadata.catalysts)) {
                                fullResponse = JSON.stringify(event.metadata);
                                hasValidJson = true;
                                console.log(`[${this.agentName}] Found JSON in metadata`);
                                break;
                            }

                            // 2. Capture du contenu avec priorité pour les types d'événements
                            if (event.content) {
                                // Priority: completion_result > text > say (non-reasoning)
                                if (event.type === 'completion_result') {
                                    fullResponse = event.content;
                                    hasValidJson = true;
                                    console.log(`[${this.agentName}] Found completion_result content`);
                                    break;
                                } else if (event.type === 'text') {
                                    fullResponse = event.content;
                                    console.log(`[${this.agentName}] Found text content`);
                                } else if (event.type === 'say' && event.say !== 'reasoning') {
                                    fullResponse = event.content;
                                    console.log(`[${this.agentName}] Found say content (non-reasoning)`);
                                }
                            }

                            // 3. Détection précoce de JSON dans le contenu
                            if (event.content && !hasValidJson) {
                                // Cherche des structures JSON dans le contenu
                                const jsonInContent = this.extractJsonFromText(event.content);
                                if (jsonInContent) {
                                    jsonCandidate = jsonInContent;
                                    console.log(`[${this.agentName}] Found JSON candidate in content`);
                                }
                            }

                            // 4. Si KiloCode demande une validation, on termine proprement
                            if (event.type === 'ask' && event.ask === 'completion_result') {
                                console.log(`[${this.agentName}] Completion validation requested, terminating process...`);
                                child.kill('SIGTERM');
                                break;
                            }

                        } catch (e) {
                            // Ignorer les lignes malformées mais essayer d'extraire du JSON
                            const jsonInLine = this.extractJsonFromText(line);
                            if (jsonInLine) {
                                jsonCandidate = jsonInLine;
                                console.log(`[${this.agentName}] Found JSON in malformed line`);
                            }
                        }
                    }

                    // 5. Validation finale du JSON
                    let finalJson = '';

                    // Priorité 1: JSON valide trouvé dans les événements
                    if (hasValidJson && this.isValidJson(fullResponse)) {
                        finalJson = fullResponse;
                    }
                    // Priorité 2: JSON candidat extrait
                    else if (jsonCandidate && this.isValidJson(jsonCandidate)) {
                        finalJson = jsonCandidate;
                    }
                    // Priorité 3: Fallback - chercher JSON dans tout le stdout
                    else {
                        const jsonInStdout = this.extractJsonFromText(stdoutData);
                        if (jsonInStdout && this.isValidJson(jsonInStdout)) {
                            finalJson = jsonInStdout;
                            console.log(`[${this.agentName}] Found JSON in stdout fallback`);
                        } else {
                            finalJson = fullResponse;
                            console.log(`[${this.agentName}] Using raw response as fallback`);
                        }
                    }

                    console.log(`[${this.agentName}] Final JSON length: ${finalJson.length} chars`);

                    // 6. Nettoyage final du Markdown et des artefacts
                    let cleanJson = this.cleanJsonResponse(finalJson);

                    // Tentative de parsing du JSON nettoyé
                    try {
                        const parsed = JSON.parse(cleanJson);

                        // Validation du contenu pour le SentimentAgent
                        if (this.validateSentimentJson(parsed)) {
                            console.log(`[${this.agentName}] JSON parsing successful`);
                            resolve(parsed);
                            return;
                        } else {
                            console.warn(`[${this.agentName}] JSON structure invalid, trying fallback...`);
                        }
                    } catch (e) {
                        console.warn(`[${this.agentName}] JSON parsing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
                    }

                    // Fallback: Parser Markdown si disponible
                    const markdownResult = this.parseMarkdownFallback(finalJson);
                    if (markdownResult) {
                        console.log(`[${this.agentName}] Markdown fallback successful`);
                        resolve(markdownResult);
                        return;
                    }

                    // Si tout échoue, retourner une erreur claire
                    console.error(`[${this.agentName}] All parsing methods failed`);
                    console.error(`[${this.agentName}] Cleaned JSON preview:`, cleanJson.substring(0, 200) + '...');
                    reject(new Error('Failed to parse KiloCode output - no valid JSON or markdown format found'));

                } catch (error) {
                    console.error(`[${this.agentName}] Parsing Failed:`, error);
                    reject(error);
                } finally {
                    // Nettoyer le fichier temporaire si existe
                    if (tempFile) {
                        try {
                            await fs.unlink(tempFile);
                            console.log(`[${this.agentName}] Cleaned up temporary file: ${tempFile}`);
                        } catch (e) {
                            console.warn(`[${this.agentName}] Failed to clean temporary file: ${e}`);
                        }
                    }
                }
            });

            child.on('error', (err: any) => {
                // Nettoyer le fichier temporaire en cas d'erreur
                if (tempFile) {
                    fs.unlink(tempFile).catch(() => {}); // Ignorer les erreurs de nettoyage
                }
                reject(err);
            });
        });
    }

    /**
     * Extrait et valide du JSON depuis du texte
     */
    private extractJsonFromText(text: string): string | null {
        if (!text) return null;

        // 1. Cherche les blocs ```json ou ```
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            return jsonMatch[1].trim();
        }

        // 2. Cherche les objets JSON complets { ... }
        const braceMatch = text.match(/\{[^{}]*\{[^{}]*\}[^{}]*\}/) || text.match(/\{[\s\S]*?\}/);
        if (braceMatch) {
            return braceMatch[0].trim();
        }

        // 3. Cherche des patterns spécifiques au SentimentAgent
        const sentimentMatch = text.match(/\{[\s\S]*"sentiment"[\s\S]*\}/);
        if (sentimentMatch) {
            return sentimentMatch[0].trim();
        }

        return null;
    }

    /**
     * Valide si une chaîne est du JSON valide
     */
    private isValidJson(str: string): boolean {
        if (!str || typeof str !== 'string') return false;

        const trimmed = str.trim();
        if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;

        try {
            JSON.parse(trimmed);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Nettoie la réponse JSON des artefacts Markdown et d'échappement
     */
    private cleanJsonResponse(response: string): string {
        if (!response) return '';

        let cleaned = response.trim();

        // 1. Retire les blocs de code markdown
        cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

        // 2. Retire les quotes d'échappement au début/fin
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }

        // 3. Corrige les échappements incorrects
        cleaned = cleaned.replace(/\\"/g, '"').replace(/\\n/g, '\n');

        // 4. Trouve le premier objet JSON valide
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        return cleaned;
    }

    /**
     * Valide la structure JSON pour le SentimentAgent
     */
    private validateSentimentJson(parsed: any): boolean {
        if (!parsed || typeof parsed !== 'object') return false;

        // Vérifie les champs requis pour le SentimentAgent
        const hasSentiment = parsed.sentiment && typeof parsed.sentiment === 'string';
        const hasValidSentiment = ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.sentiment?.toUpperCase());
        const hasScore = typeof parsed.score === 'number';
        const hasRiskLevel = ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.risk_level?.toUpperCase());
        const hasCatalysts = Array.isArray(parsed.catalysts);
        const hasSummary = typeof parsed.summary === 'string';

        return hasSentiment && hasValidSentiment && hasScore && hasRiskLevel && hasCatalysts && hasSummary;
    }

    /**
     * Fallback parser pour format Markdown
     */
    private parseMarkdownFallback(text: string): any | null {
        if (!text) return null;

        try {
            const sentimentMatch = text.match(/\*\*SENTIMENT:\*\*\s*(\w+)/i) ||
                                  text.match(/sentiment["\s:]+(\w+)/i) ||
                                  text.match(/"sentiment"\s*:\s*"(\w+)"/i);

            const scoreMatch = text.match(/\((-?\d+)\/100\)/) ||
                             text.match(/score["\s:]+(-?\d+)/i) ||
                             text.match(/"score"\s*:\s*(-?\d+)/i);

            const riskMatch = text.match(/\*\*RISK LEVEL:\*\*\s*(\w+)/i) ||
                            text.match(/risk[_\s]*level["\s:]+(\w+)/i) ||
                            text.match(/"risk_level"\s*:\s*"(\w+)"/i);

            const summaryMatch = text.match(/\*\*SUMMARY:\*\*\s*([\s\S]+?)$/i) ||
                               text.match(/summary["\s:]+(.+?)(?:\n|$)/i) ||
                               text.match(/"summary"\s*:\s*"([^"]+)"/i);

            // Extraction des catalysts
            const catalysts: string[] = [];

            // Format de liste à puces
            const bulletRegex = /[-*+]\s+(.+?)(?=\n[-*+]|\n\n|$)/g;
            let bulletMatch;
            while ((bulletMatch = bulletRegex.exec(text)) !== null) {
                const catalyst = bulletMatch[1].trim();
                if (catalyst.length > 0 && catalyst.length < 200) {
                    catalysts.push(catalyst);
                }
            }

            // Format JSON dans texte
            const catalystJsonMatch = text.match(/"catalysts"\s*:\s*\[(.*?)\]/s);
            if (catalystJsonMatch) {
                try {
                    const catalystArray = JSON.parse(`[${catalystJsonMatch[1]}]`);
                    if (Array.isArray(catalystArray)) {
                        catalysts.push(...catalystArray.filter(c => typeof c === 'string'));
                    }
                } catch (e) {
                    // Ignorer les erreurs de parsing
                }
            }

            if (sentimentMatch) {
                const sentiment = sentimentMatch[1].toUpperCase();
                const validSentiment = ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(sentiment) ? sentiment : 'NEUTRAL';

                return {
                    sentiment: validSentiment,
                    score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
                    risk_level: riskMatch ? riskMatch[1].toUpperCase() : 'MEDIUM',
                    catalysts: catalysts.slice(0, 5), // Limiter à 5 catalysts
                    summary: summaryMatch ? summaryMatch[1].trim().replace(/"/g, '') : "No summary extracted."
                };
            }
        } catch (e) {
            console.warn(`[${this.agentName}] Markdown parsing error:`, e);
        }

        return null;
    }
}
