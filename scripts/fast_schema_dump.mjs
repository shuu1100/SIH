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

async function dumpFast() {
  console.log('Fetching all columns, tables, keys from information_schema...');
  const conn = await mysql.createConnection(dbConfig);
  
  const [columns] = await conn.query(`
    SELECT 
      TABLE_NAME, 
      COLUMN_NAME, 
      DATA_TYPE, 
      COLUMN_TYPE, 
      IS_NULLABLE, 
      COLUMN_KEY, 
      COLUMN_DEFAULT, 
      EXTRA
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'sih'
    ORDER BY TABLE_NAME, ORDINAL_POSITION;
  `);

  const [foreignKeys] = await conn.query(`
    SELECT 
      TABLE_NAME, 
      COLUMN_NAME, 
      REFERENCED_TABLE_NAME, 
      REFERENCED_COLUMN_NAME, 
      CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'sih' AND REFERENCED_TABLE_NAME IS NOT NULL;
  `);

  const schemaMap = {};
  for (const row of columns) {
    if (!schemaMap[row.TABLE_NAME]) {
      schemaMap[row.TABLE_NAME] = {
        columns: {},
        columnList: [],
        primaryKey: [],
        foreignKeys: []
      };
    }
    schemaMap[row.TABLE_NAME].columns[row.COLUMN_NAME] = {
      type: row.COLUMN_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      key: row.COLUMN_KEY,
      default: row.COLUMN_DEFAULT,
      extra: row.EXTRA
    };
    schemaMap[row.TABLE_NAME].columnList.push(row.COLUMN_NAME);
    if (row.COLUMN_KEY === 'PRI') {
      schemaMap[row.TABLE_NAME].primaryKey.push(row.COLUMN_NAME);
    }
  }

  for (const fk of foreignKeys) {
    if (schemaMap[fk.TABLE_NAME]) {
      schemaMap[fk.TABLE_NAME].foreignKeys.push({
        column: fk.COLUMN_NAME,
        refTable: fk.REFERENCED_TABLE_NAME,
        refColumn: fk.REFERENCED_COLUMN_NAME,
        constraint: fk.CONSTRAINT_NAME
      });
    }
  }

  fs.writeFileSync(path.resolve(process.cwd(), 'database_schema_inventory.json'), JSON.stringify(schemaMap, null, 2));
  console.log(`✅ Schema dumped for ${Object.keys(schemaMap).length} tables to database_schema_inventory.json`);

  await conn.end();
}

dumpFast().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
