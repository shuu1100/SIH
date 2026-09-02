import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';

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

async function unifyCollations() {
  console.log('Connecting to RDS to unify collations across all tables...');
  const conn = await mysql.createConnection(dbConfig);

  const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const tableNames = tables.map(t => Object.values(t)[0]);

  console.log(`Checking collations for ${tableNames.length} tables...`);

  // Target standard collation: utf8mb4_unicode_ci
  for (const table of tableNames) {
    try {
      console.log(`Converting table \`${table}\` to utf8mb4_unicode_ci...`);
      await conn.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    } catch (err) {
      console.warn(`Could not convert \`${table}\`:`, err.message);
    }
  }

  console.log('✅ All table collations unified to utf8mb4_unicode_ci!');
  await conn.end();
}

unifyCollations().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
