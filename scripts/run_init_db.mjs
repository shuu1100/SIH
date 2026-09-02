import { initDatabase, checkDbConnection } from '../lib/db.ts';

async function main() {
  console.log('Testing DB connection...');
  const health = await checkDbConnection();
  console.log('Health Check:', health);

  if (!health.success) {
    throw new Error(`DB connection failed: ${health.message}`);
  }

  console.log('Running initDatabase()...');
  const res = await initDatabase();
  console.log('initDatabase result:', res);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
