"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToonFormatter = void 0;
/**
 * Utilitaire de formatage TOON (Token-Oriented Object Notation)
 * Optimise la sérialisation des données pour les prompts LLM.
 */
class ToonFormatter {
    /**
     * Convertit un tableau d'objets JSON en format TOON tabulaire.
     * @param keyName Le nom de la clé parente (ex: "users")
     * @param data Tableau d'objets uniformes
     */
    static arrayToToon(keyName, data) {
        if (!data || data.length === 0)
            return `${keyName}[0]{}:`;
        // Récupération des clés du premier objet pour définir les colonnes
        const columns = Object.keys(data[0]);
        const count = data.length;
        // En-tête: users[2]{id,name,role}:
        let output = `${keyName}[${count}]{${columns.join(',')}}:\n`;
        // Lignes de données
        output += data.map(item => {
            return '  ' + columns.map(col => {
                const val = item[col];
                // Gestion basique des types (string, number, boolean)
                if (typeof val === 'string') {
                    // Si contient des virgules, on pourrait devoir échapper, 
                    // mais pour l'exemple simple on garde brut ou on remplace
                    return val.includes(',') ? `"${val}"` : val;
                }
                return String(val);
            }).join(',');
        }).join('\n');
        return output;
    }
    /**
     * Convertit un objet JSON complet en TOON (récursif simplifié ou hybride)
     */
    static jsonToToon(json) {
        let output = '';
        for (const [key, value] of Object.entries(json)) {
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                // Détection de tableau d'objets -> Format Tabulaire
                output += this.arrayToToon(key, value) + '\n';
            }
            else {
                // Fallback simple pour les autres types (clé: valeur)
                output += `${key}: ${JSON.stringify(value)}\n`;
            }
        }
        return output.trim();
    }
}
exports.ToonFormatter = ToonFormatter;
