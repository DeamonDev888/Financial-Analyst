import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'data', 'agent-data', 'sentiment-agent', 'sentiment_analysis.json');
const fullResponse = fs.readFileSync(filePath, 'utf-8');

console.log("Loaded file content length:", fullResponse.length);

// Logic from BaseAgent.ts
const sentimentMatch = fullResponse.match(/\*\*SENTIMENT:\*\*\s*(\w+)/i);
const scoreMatch = fullResponse.match(/\((-?\d+)\/100\)/);
const riskMatch = fullResponse.match(/\*\*RISK LEVEL:\*\*\s*(\w+)/i);
const summaryMatch = fullResponse.match(/\*\*SUMMARY:\*\*\s*([\s\S]+?)$/i);

// Extraction des catalysts (liste à puces)
const catalysts: string[] = [];
const catalystRegex = /-\s+(.+)/g;
let match;
while ((match = catalystRegex.exec(fullResponse)) !== null) {
    // On évite de capturer des lignes qui ne sont pas des catalysts (ex: dans le résumé)
    if (match.index < (summaryMatch?.index || Infinity)) {
        catalysts.push(match[1].trim());
    }
}

if (sentimentMatch) {
    const result = {
        sentiment: sentimentMatch[1].toUpperCase(),
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        risk_level: riskMatch ? riskMatch[1].toUpperCase() : 'MEDIUM',
        catalysts: catalysts,
        summary: summaryMatch ? summaryMatch[1].trim() : "No summary extracted."
    };
    console.log("Markdown fallback successful.");
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log("Markdown fallback failed.");
}
