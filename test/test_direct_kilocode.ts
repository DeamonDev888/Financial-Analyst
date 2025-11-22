import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Test direct du parsing KiloCode avec la solution identifiée
 */

async function main() {
    console.log("🚀 Testing DIRECT KiloCode solution");
    console.log("=".repeat(50));

    try {
        // 1. Créer un fichier avec le gros prompt
        const promptPath = path.join(process.cwd(), 'test_prompt.txt');
        await fs.writeFile(promptPath, `
You are an expert Market Sentiment Analyst for ES Futures (S&P 500).

TASK:
Analyze the provided TOON data below and return the result in strict JSON format.

CRITICAL INSTRUCTIONS:
1. Output ONLY valid JSON.
2. Do NOT use Markdown code blocks.
3. Do NOT include any reasoning or conversational text.
4. The output must be parseable by JSON.parse().

EXAMPLE OUTPUT:
{
  "sentiment": "BULLISH",
  "score": 75,
  "catalysts": ["Fed Rate Cut", "AI Tech Rally"],
  "risk_level": "LOW",
  "summary": "Market is rallying due to dovish Fed and strong AI sector performance."
}

JSON STRUCTURE:
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "score": number,
  "catalysts": ["string", "string", "string"],
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "summary": "Brief explanation of the verdict"
}

DATA TO ANALYZE:
<toon_data>
headlines[3]{title,src}:
  Fed Cuts Rates by 50bps,CNBC
  Tech Stocks Rally on AI News,ZeroHedge
  Bitcoin Falls Below $80000,CNBC
</toon_data>

REMINDER:
1. Analyze the data above.
2. Output ONLY the JSON object defined in "JSON STRUCTURE".
3. NO introductory text. NO markdown. NO explanations outside the JSON.
`, 'utf-8');

        console.log("📝 Prompt file created successfully");

        // 2. Exécuter KiloCode avec cat (la bonne commande!)
        console.log("🔧 Executing KiloCode with cat (CORRECT METHOD)...");
        const command = `cat "${promptPath}" | kilocode -m ask --auto --json`;
        console.log(`Command: ${command}`);

        const { stdout } = await execAsync(command, {
            timeout: 60000, // 1 minute
            cwd: process.cwd()
        });

        console.log(`\n✅ KiloCode completed! Output length: ${stdout.length} chars`);

        // Afficher les premières lignes pour debug
        console.log("\n📄 FIRST 10 LINES OF OUTPUT:");
        const firstLines = stdout.split('\n').slice(0, 10);
        firstLines.forEach((line, i) => console.log(`${i+1}: ${line.substring(0, 100)}...`));

        // 3. Parser le résultat avec notre solution robuste
        const result = parseKiloCodeOutput(stdout);

        console.log("\n🎉 PARSED RESULT:");
        console.log(JSON.stringify(result, null, 2));

        // 4. Nettoyer
        await fs.unlink(promptPath);
        console.log("\n🧹 Cleaned up successfully");

    } catch (error) {
        console.error("\n❌ FAILED:");
        console.error(error);
    }
}

function parseKiloCodeOutput(stdoutData: string): any {
    console.log("🔍 Parsing KiloCode output...");

    // Parser les lignes NDJSON
    const lines = stdoutData.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
        try {
            const event = JSON.parse(line);

            // Priorité absolue: JSON dans metadata (le plus fiable)
            if (event.metadata && (event.metadata.sentiment || event.metadata.score || event.metadata.catalysts)) {
                console.log("✅ Found JSON in metadata!");
                return validateJson(event.metadata);
            }

            // Deuxième priorité: completion_result content
            if (event.type === 'completion_result' && event.content) {
                const jsonInContent = extractJson(event.content);
                if (jsonInContent) {
                    console.log("✅ Found JSON in completion_result!");
                    return validateJson(jsonInContent);
                }
            }

            // Troisième priorité: text content (sauf reasoning)
            if (event.type === 'say' && event.say !== 'reasoning' && event.content) {
                const jsonInContent = extractJson(event.content);
                if (jsonInContent) {
                    console.log("✅ Found JSON in text content!");
                    return validateJson(jsonInContent);
                }
            }
        } catch (e) {
            // Ignorer les lignes non-JSON
        }
    }

    // Fallback: chercher JSON dans tout le stdout
    const jsonInStdout = extractJson(stdoutData);
    if (jsonInStdout) {
        console.log("✅ Found JSON in stdout fallback!");
        return validateJson(jsonInStdout);
    }

    throw new Error('No valid JSON found in KiloCode output');
}

function extractJson(text: string): any {
    // Chercher les objets JSON complets
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        return null;
    }
}

function validateJson(parsed: any): any {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON structure');
    }

    // Valider et normaliser
    return {
        sentiment: parsed.sentiment ? parsed.sentiment.toUpperCase() : 'NEUTRAL',
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        risk_level: parsed.risk_level ? parsed.risk_level.toUpperCase() : 'MEDIUM',
        catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
        summary: parsed.summary || 'No summary available'
    };
}

main().catch(console.error);