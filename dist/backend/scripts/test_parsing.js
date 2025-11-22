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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const filePath = path.join(process.cwd(), 'data', 'agent-data', 'sentiment-agent', 'sentiment_analysis.json');
const fullResponse = fs.readFileSync(filePath, 'utf-8');
console.log("Loaded file content length:", fullResponse.length);
// Logic from BaseAgent.ts
const sentimentMatch = fullResponse.match(/\*\*SENTIMENT:\*\*\s*(\w+)/i);
const scoreMatch = fullResponse.match(/\((-?\d+)\/100\)/);
const riskMatch = fullResponse.match(/\*\*RISK LEVEL:\*\*\s*(\w+)/i);
const summaryMatch = fullResponse.match(/\*\*SUMMARY:\*\*\s*([\s\S]+?)$/i);
// Extraction des catalysts (liste à puces)
const catalysts = [];
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
}
else {
    console.log("Markdown fallback failed.");
}
