# Client VIX pour Sierra Chart

Ce projet contient des scripts TypeScript pour se connecter à votre serveur Sierra Chart et récupérer les données de l'indice VIX en temps réel.

## Fichiers

- `get_vix_data.ts` - Client complet avec gestion des événements et reconnexion automatique
- `vix_simple_example.ts` - Exemple simple pour obtenir rapidement le prix actuel du VIX

## Configuration

Assurez-vous que votre serveur Sierra Chart :
1. **Est en cours d'exécution** sur le port 11099
2. **Le serveur DTC (Data Trading Client) est activé**
3. **Le symbole VIX est configuré** dans votre chartbook

Dans Sierra Chart, pour activer le serveur DTC :
- Allez dans `File` > `Connect to Data Feed`
- Configurez votre connexion de données
- Allez dans `Tools` > `Options` > `Server Settings`
- Activez "DTC Server" sur le port 11099 (ou votre port personnalisé)

## Utilisation

### 1. Obtenir le prix actuel du VIX (simple et rapide)

```bash
npm run vix
```

Ce script va :
- Se connecter à Sierra Chart
- Récupérer le prix actuel du VIX
- Afficher le résultat et se déconnecter automatiquement

### 2. Suivre les données VIX en temps réel

```bash
npm run vix:live
```

Ce script va :
- Maintenir une connexion persistante
- Afficher chaque mise à jour du VIX
- Gérer automatiquement les reconnexions
- Permettre de demander des données historiques

## Utilisation dans votre code

### Import simple

```typescript
import { getCurrentVIXPrice } from './src/backend/scripts/vix_simple_example';

async function example() {
    try {
        const vixPrice = await getCurrentVIXPrice();
        console.log(`Prix VIX actuel: ${vixPrice}`);
    } catch (error) {
        console.error('Erreur:', error);
    }
}
```

### Client complet avec événements

```typescript
import SierraChartVIXClient, { VIXData } from './src/backend/scripts/get_vix_data';

const client = new SierraChartVIXClient({
    host: 'localhost',
    port: 11099,
    symbol: '.VIX'  // ou 'VIX' selon votre configuration
});

// Écouter les mises à jour
client.on('vixData', (data: VIXData) => {
    console.log(`VIX: ${data.lastPrice} (${data.changePercent}%)`);
});

client.on('error', (error) => {
    console.error('Erreur:', error);
});

// Démarrer
await client.connect();
```

## Configuration avancée

Vous pouvez personnaliser la configuration :

```typescript
const config = {
    host: 'localhost',      // Adresse du serveur Sierra Chart
    port: 11099,            // Port DTC
    symbol: '.VIX',         // Symbole VIX (peut varier)
    username: 'user',       // Optionnel: si authentification requise
    password: 'pass'        // Optionnel: si authentification requise
};
```

## Symboles VIX possibles

Selon votre fournisseur de données, le symbole peut être :
- `.VIX` (format standard)
- `VIX` (format alternatif)
- `$VIX` (format parfois utilisé)
- `VIX.XO` (format avec exchange)

## Données disponibles

Chaque mise à jour contient :

```typescript
interface VIXData {
    symbol: string;         // Symbole
    lastPrice: number;      // Dernier prix
    bid: number;           // Prix d'achat
    ask: number;           // Prix de vente
    volume: number;        // Volume
    timestamp: Date;       // Horodatage
    change: number;        // Variation absolue
    changePercent: number; // Variation en pourcentage
    open: number;          // Prix d'ouverture
    high: number;          // Plus haut
    low: number;           // Plus bas
}
```

## Dépannage

### Problèmes courants

1. **"Connection refused"**
   - Vérifiez que Sierra Chart est en cours d'exécution
   - Vérifiez le port (11099 par défaut)
   - Vérifiez que le serveur DTC est activé

2. **"Timeout: Aucune donnée reçue"**
   - Le symbole VIX n'est peut-être pas disponible
   - Essayez un autre symbole VIX (`.VIX`, `VIX`, etc.)
   - Vérifiez votre connexion de données dans Sierra Chart

3. **"Authentication failed"**
   - Ajoutez les identifiants dans la configuration si nécessaire
   - Vérifiez les paramètres de sécurité DTC dans Sierra Chart

4. **"No data received"**
   - Le marché est peut-être fermé
   - Le symbole n'est pas configuré dans votre chartbook
   - Vérifiez votre abonnement de données

### Logs et débogage

Les scripts incluent des logs détaillés. Pour plus de verbosité :

```typescript
// Dans get_vix_data.ts, modifiez les logs si nécessaire
console.log('État détaillé de la connexion...');
```

## Sécurité

- Assurez-vous que votre port 11099 n'est pas exposé publiquement
- Utilisez des identifiants si le serveur DTC requiert une authentification
- Considérez un firewall pour limiter l'accès au localhost

## Intégration avec le reste de votre système

Ces scripts peuvent être facilement intégrés avec vos autres services :

- Base de données PostgreSQL existante
- Agents de sentiment analysis
- Pipeline de données de marché

Exemple d'intégration :

```typescript
import { getCurrentVIXPrice } from './vix_simple_example';
import { NewsDatabaseService } from './database/NewsDatabaseService';

async function storeVIXInDatabase() {
    const db = new NewsDatabaseService();
    const vixPrice = await getCurrentVIXPrice();

    // Stocker dans votre base de données
    await db.query(`
        INSERT INTO market_indicators (symbol, value, timestamp)
        VALUES ('VIX', $1, NOW())
    `, [vixPrice]);
}
```

## Support

Si vous rencontrez des problèmes :

1. Vérifiez la documentation de Sierra Chart pour le protocole DTC
2. Consultez les logs de Sierra Chart
3. Testez avec différents symboles VIX
4. Vérifiez votre connectivité réseau