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

async function testRegistrationFlow() {
  console.log('Testing farmer registration database logic...');
  const conn = await mysql.createConnection(dbConfig);
  
  const testPhone = '8004252399'; // Same phone from the user screenshot!
  const testEmail = 'shubham@smartcrop.in';
  const testName = 'Shubham Prakash';
  const testState = 'Uttar Pradesh';
  const testDistrict = 'CHANDOLI';
  const testVillage = 'Mughalsarai';
  const testCrop = 'Groundnut';
  const testArea = 9.0;
  const testLang = 'te';

  // First delete any existing test record with this phone to ensure clean test
  await conn.query('DELETE FROM notifications WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = ?)', [testPhone]);
  await conn.query('DELETE FROM crops WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = ?)', [testPhone]);
  await conn.query('DELETE FROM farms WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = ?)', [testPhone]);
  await conn.query('DELETE FROM users WHERE id IN (SELECT id FROM farmers WHERE phone = ?)', [testPhone]);
  await conn.query('DELETE FROM farmers WHERE phone = ?', [testPhone]);

  console.log(`Checking duplicate phone '${testPhone}' against farmers and users...`);
  const [existingFarmers] = await conn.query('SELECT id FROM farmers WHERE phone = ? LIMIT 1;', [testPhone]);
  const [existingUsers] = await conn.query('SELECT id FROM users WHERE (email = ? AND ? IS NOT NULL) LIMIT 1;', [testEmail, testEmail]);

  console.log(`Duplicate check passed: farmers=${existingFarmers.length}, users=${existingUsers.length}`);

  const timestamp = Date.now();
  const farmerId = `FRM_${timestamp.toString().slice(-8)}`;
  const farmId = `FRM_LAND_${timestamp.toString().slice(-8)}`;
  const cropId = `CRP_${timestamp.toString().slice(-8)}`;
  const notifId = `NTF_${timestamp.toString().slice(-8)}`;

  await conn.beginTransaction();

  // 1. Insert Farmer
  await conn.query(`
    INSERT INTO farmers (id, name, phone, email, password_hash, district, village, language, land_area, state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [farmerId, testName, testPhone, testEmail, '$2a$10$hasheddemo', testDistrict, testVillage, testLang, testArea, testState]);

  // 2. Insert User
  await conn.query(`
    INSERT INTO users (id, email, name, role, profile_id)
    VALUES (?, ?, ?, 'farmer', ?);
  `, [farmerId, testEmail, testName, farmerId]);

  // 3. Insert Farm
  await conn.query(`
    INSERT INTO farms (id, farmer_id, name, latitude, longitude, area, soil_type, village, district)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [farmId, farmerId, `${testName}'s Farm`, 25.2677, 83.1234, testArea, 'Red Loamy', testVillage, testDistrict]);

  // 4. Insert Crop
  await conn.query(`
    INSERT INTO crops (id, farmer_id, name, stage, sowing_date)
    VALUES (?, ?, ?, ?, ?);
  `, [cropId, farmerId, testCrop, 'Vegetative', '2026-07-15']);

  // 5. Insert Notification
  await conn.query(`
    INSERT INTO notifications (id, user_id, farmer_id, type, priority, title, message, action_label, action_url)
    VALUES (?, ?, ?, 'welcome', 'info', 'Welcome Shubham', 'Your farm profile is active.', 'View Dashboard', '/dashboard');
  `, [notifId, farmerId, farmerId]);

  await conn.commit();
  console.log('✅ Transaction COMMITTED successfully!');

  // Verify retrieval
  const [retrieved] = await conn.query('SELECT id, name, phone, district, village, state, land_area FROM farmers WHERE id = ?', [farmerId]);
  console.log('✅ Retrieved registered farmer from RDS MySQL:', JSON.stringify(retrieved[0]));

  await conn.end();
}

testRegistrationFlow().catch(err => {
  console.error('❌ Registration test failed:', err);
  process.exit(1);
});
