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
     * Exécute une requête KiloCode via le CLI
     */
    protected async callKiloCode(req: AgentRequest): Promise<any> {
        const fullOutputPath = path.join(process.cwd(), req.outputFile);

        // Construction de la commande
        // Mode: ask (par défaut), Modèle: configuré dans ~/.kilocode/cli/config.json
        // Note: On injecte le contexte TOON si présent dans le prompt ou via le fichier d'entrée
        let command = `kilocode -m ask --auto --json "${req.prompt.replace(/"/g, '\\"')}"`;

        // Gestion du pipeline d'entrée
        if (req.inputFile) {
            const fullInputPath = path.join(process.cwd(), req.inputFile);
            // Utilisation de 'type' pour Windows, 'cat' pour Linux/Mac serait mieux géré avec une détection d'OS
            // Mais ici on assume l'environnement Windows de l'utilisateur
            command = `type "${fullInputPath}" | ${command}`;
        }

        // 4. Exécution via SPAWN (Streaming) pour éviter les limites de buffer de exec
        console.log(`[${this.agentName}] Executing AI (Spawn Mode): ${command}`);

        return new Promise((resolve, reject) => {
            // Sur Windows, on doit utiliser un shell pour le pipe (|)
            const child = require('child_process').spawn(command, {
                shell: true,
                cwd: process.cwd()
            });

            let stdoutData = '';
            let stderrData = '';

            child.stdout.on('data', (chunk: any) => {
                stdoutData += chunk.toString();
            });

            child.stderr.on('data', (chunk: any) => {
                stderrData += chunk.toString();
            });

            child.on('close', async (code: number) => {
                if (code !== 0) {
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

                    // Parsing du flux NDJSON
                    const lines = stdoutData.split('\n').filter((line: string) => line.trim() !== '');
                    let fullResponse = '';

                    for (const line of lines) {
                        try {
                            const event = JSON.parse(line);
                            // On ignore le "reasoning" pour ne garder que le résultat final
                            // IMPORTANT: KiloCode envoie le texte COMPLET à chaque update (snapshot), pas un delta.
                            // Donc on remplace fullResponse au lieu de concaténer.
                            if (event.type === 'say' && event.content && event.say !== 'reasoning') {
                                fullResponse = event.content;
                            }
                        } catch (e) {
                            // Ignorer les lignes malformées ou non-JSON
                        }
                    }

                    console.log(`[${this.agentName}] AI Response Length: ${fullResponse.length} chars`);

                    // Fallback: si le parsing NDJSON échoue (pas d'event 'say'), on prend tout le stdout
                    // (Cas où KiloCode renvoie du texte brut sans streaming)
                    if (fullResponse.length === 0 && stdoutData.length > 0) {
                        console.warn(`[${this.agentName}] Warning: No NDJSON 'say' events found. Using raw stdout.`);
                        fullResponse = stdoutData;
                    }

                    // Nettoyage du Markdown
                    const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/) || fullResponse.match(/```\s*([\s\S]*?)\s*```/);
                    let cleanJson = jsonMatch ? jsonMatch[1] : fullResponse;

                    // Tentative 1: Parsing direct (cas idéal)
                    try {
                        resolve(JSON.parse(cleanJson));
                        return;
                    } catch (e) {
                        // Continue vers le nettoyage si échec
                    }

                    // Tentative 2: Nettoyage agressif des artefacts de shell/escape (cas double-encoded)
                    // Parfois l'output contient des \" au lieu de " à cause du piping Windows
                    let aggressiveClean = cleanJson.replace(/^"|"$|\\"/g, (m) => m === '\\"' ? '"' : '') // Retire les guillemets englobants et unescape les internes
                        .replace(/\\n/g, '\n')
                        .trim();

                    // Si après nettoyage il reste des guillemets au début/fin (double stringification), on nettoie encore
                    if (aggressiveClean.startsWith('"') && aggressiveClean.endsWith('"')) {
                        aggressiveClean = aggressiveClean.slice(1, -1);
                    }

                    // On cherche le premier { et le dernier } pour extraire le JSON pur
                    const firstBrace = aggressiveClean.indexOf('{');
                    const lastBrace = aggressiveClean.lastIndexOf('}');

                    if (firstBrace !== -1 && lastBrace !== -1) {
                        aggressiveClean = aggressiveClean.substring(firstBrace, lastBrace + 1);
                    }

                    resolve(JSON.parse(aggressiveClean));

                } catch (error) {
                    console.error(`[${this.agentName}] Parsing Failed:`, error);
                    reject(error);
                }
            });

            child.on('error', (err: any) => {
                reject(err);
            });
        });
    }
}
