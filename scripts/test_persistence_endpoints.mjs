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
  connectTimeout: 20000,
  ssl: { rejectUnauthorized: false },
};

async function connectWithRetry(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`▶ Connecting to AWS RDS MySQL (Attempt ${attempt}/${retries})...`);
      const connection = await mysql.createConnection(dbConfig);
      return connection;
    } catch (err) {
      console.warn(`  Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('  SMARTCROP: FULL END-TO-END AWS RDS PERSISTENCE VERIFICATION');
  console.log('================================================================\n');

  let connection;

  try {
    connection = await connectWithRetry(3);
    console.log('✅ Connection established successfully.\n');

    // Ensure officer_interventions table exists
    await connection.query(`
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

    const timestamp = Date.now().toString().slice(-6);
    const uniquePhone = `98100${timestamp}`;
    const testFarmerId = `FRM_TEST_${timestamp}`;
    const testFarmId = `FARM_TEST_${timestamp}`;
    const testCropId = `CRP_TEST_${timestamp}`;
    const testNotifId = `NTF_TEST_${timestamp}`;
    const testIntId = `INT_TEST_${timestamp}`;

    console.log('▶ STEP 2: Testing Multi-Table Transactional Farmer Registration...');
    console.log(`   - Generated Unique Farmer ID: ${testFarmerId}`);
    console.log(`   - Unique Phone: ${uniquePhone}`);

    await connection.beginTransaction();

    // 1. Insert Farmer
    await connection.query(`
      INSERT INTO farmers (id, name, phone, email, password_hash, district, village, language, land_area, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [testFarmerId, 'Rajendra Behera', uniquePhone, `rajendra_${timestamp}@smartcrop.in`, '$2a$10$hasheddemo', 'Mayurbhanj', 'Baripada Rural', 'or', 3.75, 'Odisha']);

    // 2. Insert User (for unified auth)
    await connection.query(`
      INSERT INTO users (id, email, name, role, profile_id)
      VALUES (?, ?, ?, 'farmer', ?);
    `, [testFarmerId, `rajendra_${timestamp}@smartcrop.in`, 'Rajendra Behera', testFarmerId]);

    // 3. Insert Farm Plot
    await connection.query(`
      INSERT INTO farms (id, farmer_id, name, latitude, longitude, area, soil_type, village, district)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [testFarmId, testFarmerId, 'North Valley Farm', 21.9324, 86.7351, 3.75, 'Red Loamy', 'Baripada Rural', 'Mayurbhanj']);

    // 4. Insert Crop
    await connection.query(`
      INSERT INTO crops (id, farmer_id, name, stage, sowing_date)
      VALUES (?, ?, ?, ?, ?);
    `, [testCropId, testFarmerId, 'Paddy (Swarna MTU 7029)', 'Vegetative Stage', '2026-07-10']);

    // 5. Insert Welcome Notification
    await connection.query(`
      INSERT INTO notifications (id, user_id, farmer_id, type, priority, title, message, action_label, action_url)
      VALUES (?, ?, ?, 'welcome', 'info', 'Welcome Rajendra', 'Your farm profile is active.', 'View Dashboard', '/dashboard');
    `, [testNotifId, testFarmerId, testFarmerId]);

    // 6. Insert Officer Intervention
    await connection.query(`
      INSERT INTO officer_interventions (id, officer_id, farmer_id, farmer_name, intervention_type, notes, risk_level, status)
      VALUES (?, ?, ?, ?, ?, ?, 'MEDIUM', 'SCHEDULED');
    `, [testIntId, 'usr_admin_demo_1', testFarmerId, 'Rajendra Behera', 'Soil Nutrient Assessment', 'Scheduled baseline NPK verification.']);

    // Commit Transaction
    await connection.commit();
    console.log('✅ Transaction COMMITTED successfully across `farmers`, `users`, `farms`, `crops`, `notifications`, and `officer_interventions`.\n');

    console.log('▶ STEP 3: Verifying Data Persistence via Direct SELECT Queries...');
    
    // Query Farmer
    const [farmerRows] = await connection.query('SELECT id, name, phone, email, district, village, land_area, state FROM farmers WHERE id = ?', [testFarmerId]);
    console.log('   [FARMER]:', JSON.stringify(farmerRows[0]));

    // Query Farm
    const [farmRows] = await connection.query('SELECT id, farmer_id, name, area, soil_type FROM farms WHERE id = ?', [testFarmId]);
    console.log('   [FARM]  :', JSON.stringify(farmRows[0]));

    // Query Crop
    const [cropRows] = await connection.query('SELECT id, farmer_id, name, stage FROM crops WHERE id = ?', [testCropId]);
    console.log('   [CROP]  :', JSON.stringify(cropRows[0]));

    // Query Notification
    const [notifRows] = await connection.query('SELECT id, farmer_id, title, message FROM notifications WHERE id = ?', [testNotifId]);
    console.log('   [NOTIF] :', JSON.stringify(notifRows[0]));

    // Query Intervention
    const [intRows] = await connection.query('SELECT id, officer_id, farmer_id, intervention_type, status FROM officer_interventions WHERE id = ?', [testIntId]);
    console.log('   [INTERV]:', JSON.stringify(intRows[0]));

    if (!farmerRows[0] || !farmRows[0] || !cropRows[0] || !notifRows[0] || !intRows[0]) {
      throw new Error('Verification failed: One or more inserted records could not be retrieved from MySQL!');
    }
    console.log('✅ All 5 relational records verified in AWS RDS MySQL!\n');

    console.log('▶ STEP 4: Testing Profile Update Persistence...');
    await connection.query(`
      UPDATE farmers 
      SET village = 'Baripada Urban Block', land_area = 4.50 
      WHERE id = ?;
    `, [testFarmerId]);

    const [updatedFarmer] = await connection.query('SELECT id, village, land_area FROM farmers WHERE id = ?', [testFarmerId]);
    console.log('   [UPDATED FARMER]:', JSON.stringify(updatedFarmer[0]));
    if (updatedFarmer[0].village !== 'Baripada Urban Block') {
      throw new Error('Profile update verification failed!');
    }
    console.log('✅ Profile UPDATE verified in database.\n');

    console.log('▶ STEP 5: Testing Negative Case (Duplicate Phone Unique Constraint)...');
    try {
      await connection.query(`
        INSERT INTO farmers (id, name, phone, district, village, language, land_area, state)
        VALUES ('FRM_DUP_TEST', 'Duplicate User', ?, 'Mayurbhanj', 'Baripada', 'or', 2.0, 'Odisha');
      `, [uniquePhone]);
      throw new Error('Negative test failed: Duplicate phone was unexpectedly allowed!');
    } catch (dupErr) {
      if (dupErr.code === 'ER_DUP_ENTRY' || dupErr.message.includes('Duplicate entry')) {
        console.log(`✅ Negative test PASSED: MySQL correctly rejected duplicate phone '${uniquePhone}' with ER_DUP_ENTRY.`);
      } else {
        throw dupErr;
      }
    }

    console.log('\n▶ STEP 6: Cleaning up test records...');
    await connection.query('DELETE FROM officer_interventions WHERE id = ?', [testIntId]);
    await connection.query('DELETE FROM notifications WHERE id = ?', [testNotifId]);
    await connection.query('DELETE FROM crops WHERE id = ?', [testCropId]);
    await connection.query('DELETE FROM farms WHERE id = ?', [testFarmId]);
    await connection.query('DELETE FROM users WHERE id = ?', [testFarmerId]);
    await connection.query('DELETE FROM farmers WHERE id = ?', [testFarmerId]);
    console.log('✅ Temporary test records cleaned up cleanly.\n');

    console.log('================================================================');
    console.log('🎉 VERDICT: ALL IN-SCOPE DATA PERSISTENCE TESTS PASSED (100%)');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runEndToEndVerification();
