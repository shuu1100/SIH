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

async function testStorageFlow() {
  console.log('=====================================================');
  console.log('  TESTING COMPLETE DATA STORAGE FLOW IN AWS RDS MYSQL');
  console.log('=====================================================');

  const connection = await mysql.createConnection(dbConfig);
  console.log('✅ 1. Database Connection: SUCCESSFUL');

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testPhone = `99900${uniqueSuffix}`;
  const testFarmerId = `FRM_TEST_${uniqueSuffix}`;
  const testCropId = `CRP_TEST_${uniqueSuffix}`;
  const testFarmId = `FARM_TEST_${uniqueSuffix}`;

  try {
    console.log(`\n▶ 2. Starting Transaction for new test record (${testFarmerId})...`);
    await connection.beginTransaction();

    // Step A: Insert into farmers
    console.log('   - Executing INSERT INTO farmers...');
    await connection.query(`
      INSERT INTO farmers (id, name, phone, email, district, village, language, land_area, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [testFarmerId, 'Test Farmer Persistence', testPhone, `test_${uniqueSuffix}@smartcrop.local`, 'Mayurbhanj', 'Baripada', 'or', 4.5, 'Odisha']);

    // Step B: Insert into farms
    console.log('   - Executing INSERT INTO farms...');
    await connection.query(`
      INSERT INTO farms (id, farmer_id, name, latitude, longitude, area, soil_type, village, district)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [testFarmId, testFarmerId, 'Persistence Farm Plot 1', 21.9324, 86.7351, 4.5, 'Red Loamy', 'Baripada', 'Mayurbhanj']);

    // Step C: Insert into crops
    console.log('   - Executing INSERT INTO crops...');
    await connection.query(`
      INSERT INTO crops (id, farmer_id, name, stage, sowing_date)
      VALUES (?, ?, ?, ?, ?);
    `, [testCropId, testFarmerId, 'Paddy (Swarna)', 'Vegetative', '2026-07-15']);

    // Step D: Commit
    console.log('   - Committing Transaction...');
    await connection.commit();
    console.log('✅ 3. Transaction Committed: SUCCESSFUL');

    // Step E: Verification via SELECT
    console.log('\n▶ 4. Verifying Persistence via SELECT Query...');
    const [farmerRows] = await connection.query('SELECT id, name, phone, email, district, village, land_area, state FROM farmers WHERE id = ?', [testFarmerId]);
    const [farmRows] = await connection.query('SELECT id, farmer_id, name, area, soil_type FROM farms WHERE id = ?', [testFarmId]);
    const [cropRows] = await connection.query('SELECT id, farmer_id, name, stage, sowing_date FROM crops WHERE id = ?', [testCropId]);

    if (farmerRows.length > 0 && farmRows.length > 0 && cropRows.length > 0) {
      console.log('✅ 5. Record Retrieved from MySQL:');
      console.log('   [FARMER]:', JSON.stringify(farmerRows[0]));
      console.log('   [FARM]  :', JSON.stringify(farmRows[0]));
      console.log('   [CROP]  :', JSON.stringify(cropRows[0]));
    } else {
      throw new Error('Verification failed: Data was committed but could not be queried!');
    }

    // Step F: Clean up test record
    console.log('\n▶ 6. Cleaning up test record...');
    await connection.query('DELETE FROM crops WHERE id = ?', [testCropId]);
    await connection.query('DELETE FROM farms WHERE id = ?', [testFarmId]);
    await connection.query('DELETE FROM farmers WHERE id = ?', [testFarmerId]);
    console.log('✅ 7. Cleanup completed.');

    console.log('\n=====================================================');
    console.log('🎉 RESULT: AWS RDS MYSQL DATA PERSISTENCE FULLY VERIFIED');
    console.log('=====================================================\n');

  } catch (err) {
    await connection.rollback();
    console.error('❌ Data Storage Failed:', err);
  } finally {
    await connection.end();
  }
}

testStorageFlow();
