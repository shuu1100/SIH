import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const dbConfig = {
  host: process.env.DB_HOST || 'sih-mysql.cley86o8g8vx.eu-north-1.rds.amazonaws.com',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'kFjzqqPYEQb2awh',
  database: process.env.DB_NAME || 'sih',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 15000,
};

async function main() {
  console.log('Connecting to RDS MySQL...');
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected successfully!');

  const [tables] = await connection.query('SHOW TABLES');
  console.log(`Found ${tables.length} tables in '${dbConfig.database}':`);

  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [countRows] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    console.log(`\n----------------------------------------`);
    console.log(`TABLE: ${tableName} (${countRows[0].count} rows)`);
    const [cols] = await connection.query(`DESCRIBE \`${tableName}\``);
    console.table(cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));
    
    if (countRows[0].count > 0 && countRows[0].count <= 10) {
      const [data] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 10`);
      console.log(`Data in ${tableName}:`);
      console.log(JSON.stringify(data, null, 2));
    } else if (countRows[0].count > 10) {
      const [data] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
      console.log(`Sample 3 rows in ${tableName}:`);
      console.log(JSON.stringify(data, null, 2));
    }
  }

  await connection.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
