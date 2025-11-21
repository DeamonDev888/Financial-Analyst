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

        // Redirection de sortie
        command = `${command} > "${fullOutputPath}"`;

        console.log(`[${this.agentName}] Executing AI: ${command}`);

        try {
            // Exécution
            await execAsync(command);

            // Lecture du résultat
            const resultRaw = await fs.readFile(fullOutputPath, 'utf-8');
            return JSON.parse(resultRaw);

        } catch (error) {
            console.error(`[${this.agentName}] AI Execution Failed:`, error);
            throw error;
        }
    }
}
