import mysql from 'mysql2/promise';

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
  const c = await mysql.createConnection(dbConfig);
  console.log('Connected!');

  console.log('Ensuring officer_interventions table exists...');
  await c.query(`
    CREATE TABLE IF NOT EXISTS officer_interventions (
      id VARCHAR(64) PRIMARY KEY,
      officer_id VARCHAR(64) NOT NULL,
      farmer_id VARCHAR(64) NOT NULL,
      farmer_name VARCHAR(255),
      intervention_type VARCHAR(100) NOT NULL,
      notes TEXT,
      outcome TEXT,
      risk_level VARCHAR(50) DEFAULT 'MEDIUM',
      status VARCHAR(50) DEFAULT 'SCHEDULED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_officer (officer_id),
      INDEX idx_farmer (farmer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅ officer_interventions table verified/created in RDS MySQL!');
  const [cols] = await c.query('DESCRIBE officer_interventions');
  console.table(cols);

  await c.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
