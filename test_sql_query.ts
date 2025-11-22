import { NewsDatabaseService } from './src/backend/database/NewsDatabaseService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testQuery() {
    const db = new NewsDatabaseService();
    // Silence the connection log
    const originalLog = console.log;
    console.log = () => {}; 
    await db.testConnection();
    console.log = originalLog;

    console.log("🧪 Testing SQL Query from docs...");
    console.log("Query: SELECT title, created_at FROM news_items WHERE source = 'FRED'...");
    console.log("-".repeat(50));
    
    try {
        const result = await db['pool'].query(`
            SELECT title, created_at
            FROM news_items
            WHERE source = 'FRED'
            ORDER BY created_at DESC
            LIMIT 10;
        `);

        if (result.rows.length > 0) {
            console.log(`✅ Success! Found ${result.rows.length} FRED records:`);
            result.rows.forEach(row => {
                console.log(`   📄 ${row.title.substring(0, 80)}...`);
            });
        } else {
            console.log("⚠️ Query executed successfully but returned no rows.");
        }
    } catch (err) {
        console.error("❌ Query failed:", err);
    } finally {
        await db.close();
    }
}

testQuery();
