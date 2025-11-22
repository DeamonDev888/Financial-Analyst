import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script pour créer la base de données financial_analyst si elle n'existe pas
 */

async function createDatabase() {
    console.log("🔧 Creating PostgreSQL database if needed...");

    // Se connecter à postgres (la base par défaut)
    const defaultPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'postgres', // Base par défaut
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '9022',
    });

    try {
        // Vérifier si la base de données existe
        const checkQuery = `SELECT 1 FROM pg_database WHERE datname = 'financial_analyst'`;
        const result = await defaultPool.query(checkQuery);

        if (result.rows.length === 0) {
            console.log("📦 Creating database 'financial_analyst'...");
            await defaultPool.query('CREATE DATABASE financial_analyst');
            console.log("✅ Database 'financial_analyst' created successfully!");
        } else {
            console.log("✅ Database 'financial_analyst' already exists!");
        }

    } catch (error) {
        console.error("❌ Error creating database:", error);
        throw error;
    } finally {
        await defaultPool.end();
    }
}

createDatabase().catch(console.error);