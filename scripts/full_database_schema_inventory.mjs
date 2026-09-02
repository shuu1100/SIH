import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'sih-mysql.cley86o8g8vx.eu-north-1.rds.amazonaws.com',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'kFjzqqPYEQb2awh',
  database: process.env.DB_NAME || 'sih',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 20000,
};

async function generateInventory() {
  console.log('Connecting to AWS RDS MySQL to generate full schema inventory...');
  const connection = await mysql.createConnection(dbConfig);
  
  const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log(`Found ${tableNames.length} tables in database 'sih'.`);

  const inventory = {};

  for (const table of tableNames) {
    const [columns] = await connection.query(`DESCRIBE \`${table}\``);
    const [createTable] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
    const [indexes] = await connection.query(`SHOW INDEX FROM \`${table}\``);
    
    // Check foreign keys from information_schema
    const [fks] = await connection.query(`
      SELECT 
        COLUMN_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME, 
        CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'sih' AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL;
    `, [table]);

    inventory[table] = {
      columns: columns.map(c => ({
        field: c.Field,
        type: c.Type,
        null: c.Null,
        key: c.Key,
        default: c.Default,
        extra: c.Extra
      })),
      indexes: indexes.map(idx => ({
        name: idx.Key_name,
        column: idx.Column_name,
        unique: idx.Non_unique === 0
      })),
      foreignKeys: fks,
      createStatement: createTable[0]['Create Table']
    };
  }

  const outputPath = path.resolve(process.cwd(), 'database_inventory.json');
  fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2));
  console.log(`Full database inventory written to: ${outputPath}`);

  await connection.end();
}

generateInventory().catch(err => {
  console.error('Inventory generation failed:', err);
  process.exit(1);
});
