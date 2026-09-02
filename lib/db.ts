import mysql, { type Pool } from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';

// Ensure .env.local is loaded if running in Node.js/script context
if (!process.env.DB_PASSWORD) {
  config({ path: path.resolve(process.cwd(), '.env.local') });
  config({ path: path.resolve(process.cwd(), '.env') });
}

declare global {
  var _mysqlPool: Pool | undefined;
}

const dbConfig = {
  host: process.env.DB_HOST || 'sih-mysql.cley86o8g8vx.eu-north-1.rds.amazonaws.com',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'kFjzqqPYEQb2awh',
  database: process.env.DB_NAME || 'sih',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 15000,
  ssl: {
    rejectUnauthorized: false,
  },
};

// Singleton connection pool across serverless / dev hot-reloads
export const pool: Pool = global._mysqlPool || mysql.createPool(dbConfig);

if (process.env.NODE_ENV !== 'production') {
  global._mysqlPool = pool;
}

/**
 * Helper to execute parameterized SQL queries against AWS RDS MySQL with a quick timeout.
 */
export async function query<T = any>(sql: string, params?: any[], timeoutMs = 10000): Promise<T> {
  const queryPromise = pool.execute(sql, params).then(([rows]) => rows as T);
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err: any) {
    console.error('[Database Query Error]:', err?.message || err);
    throw err;
  }
}

/**
 * Health check helper for the database connection.
 */
export async function checkDbConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await pool.query('SELECT 1 as connected');
    return {
      success: true,
      message: 'Successfully connected to AWS RDS MySQL database (sih).',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Database connection failed: ${error.message}`,
    };
  }
}

/**
 * Initializes all core tables according to Smart Crop Architecture Specification
 */
export async function initDatabase(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    try {
      // 1. Users table (matches actual RDS schema)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          email VARCHAR(255),
          name VARCHAR(255),
          role VARCHAR(50) NOT NULL DEFAULT 'farmer',
          profile_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed default accounts in RDS if not already present
      const [existingUsers]: any = await connection.query('SELECT COUNT(*) as count FROM users;');
      if (existingUsers[0]?.count === 0) {
        await connection.query(`
          INSERT INTO users (id, email, name, role, profile_id)
          VALUES 
            ('usr_farmer_demo_1', 'farmer@smartcrop.in', 'Ramesh Kumar Patel', 'farmer', 'usr_farmer_demo_1'),
            ('usr_admin_demo_1', 'admin@agri.gov.in', 'Dr. Anil Verma (Agronomy Officer)', 'administrator', 'usr_admin_demo_1'),
            ('usr_bank_demo_1', 'bank@sbi.co.in', 'SBI Agri Credit Hub', 'bank', 'usr_bank_demo_1');
        `);
      }

      // 2. Farmers Profile table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS farmer_profiles (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(100),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(32) NOT NULL,
          district VARCHAR(100) DEFAULT 'Mayurbhanj',
          village VARCHAR(100) DEFAULT 'Baripada',
          state VARCHAR(100) DEFAULT 'Odisha',
          language VARCHAR(50) DEFAULT 'en',
          land_area DECIMAL(10,2) DEFAULT 3.50,
          soil_type VARCHAR(100) DEFAULT 'Red Loamy',
          irrigation_source VARCHAR(100) DEFAULT 'Borewell & Canal',
          loan_amount DECIMAL(12,2) DEFAULT 0.00,
          loan_due_date DATE,
          kyc_status VARCHAR(50) DEFAULT 'VERIFIED',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Crops & Crop Cycles table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS crops (
          id VARCHAR(64) PRIMARY KEY,
          farmer_id VARCHAR(64) NOT NULL,
          name VARCHAR(100) NOT NULL,
          variety VARCHAR(100) DEFAULT 'Swarna (MTU 7029)',
          stage VARCHAR(100) DEFAULT 'Vegetative Stage',
          sowing_date DATE,
          harvest_expected DATE,
          area_acres DECIMAL(8,2) DEFAULT 2.50,
          health_score INT DEFAULT 85,
          water_requirement VARCHAR(50) DEFAULT 'Medium-High',
          status VARCHAR(50) DEFAULT 'ACTIVE',
          INDEX idx_farmer (farmer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Risk Scores table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS risk_scores (
          id VARCHAR(64) PRIMARY KEY,
          farmer_id VARCHAR(64) NOT NULL,
          crop_id VARCHAR(64),
          overall_score INT NOT NULL DEFAULT 42,
          risk_level VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
          weather_risk INT DEFAULT 65,
          market_risk INT DEFAULT 38,
          pest_risk INT DEFAULT 24,
          financial_risk INT DEFAULT 45,
          soil_risk INT DEFAULT 30,
          ai_explanation TEXT,
          calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_risk_farmer (farmer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. AI Recommendations table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_recommendations (
          id VARCHAR(64) PRIMARY KEY,
          farmer_id VARCHAR(64) NOT NULL,
          category VARCHAR(50) DEFAULT 'Advisory',
          priority VARCHAR(20) DEFAULT 'HIGH',
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          action_type VARCHAR(100),
          is_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_rec_farmer (farmer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. Government Schemes table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS government_schemes (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) DEFAULT 'Machinery Subsidy',
          subsidy_percent INT DEFAULT 50,
          max_subsidy_amount DECIMAL(12,2) DEFAULT 100000.00,
          description TEXT,
          eligibility_criteria TEXT,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 7. Mandi Prices Benchmark table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS mandi_prices (
          id VARCHAR(64) PRIMARY KEY,
          crop_name VARCHAR(100) NOT NULL,
          market_name VARCHAR(255) NOT NULL,
          district VARCHAR(100) DEFAULT 'Mayurbhanj',
          state VARCHAR(100) DEFAULT 'Odisha',
          modal_price DECIMAL(10,2) NOT NULL,
          min_price DECIMAL(10,2),
          max_price DECIMAL(10,2),
          msp DECIMAL(10,2) NOT NULL,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 8. Weather Observations table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS weather_observations (
          id VARCHAR(64) PRIMARY KEY,
          farmer_id VARCHAR(64),
          district VARCHAR(100) DEFAULT 'Mayurbhanj',
          temperature DECIMAL(5,2),
          rainfall DECIMAL(8,2) DEFAULT 0.00,
          forecast_rainfall DECIMAL(8,2) DEFAULT 0.00,
          humidity DECIMAL(5,2),
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 11. Officer Interventions table
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

      // 12. Officer Settings table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS officer_settings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id VARCHAR(100) NOT NULL,
          notify_high_distress BOOLEAN DEFAULT TRUE,
          notify_weather_emergency BOOLEAN DEFAULT TRUE,
          notify_new_assignment BOOLEAN DEFAULT TRUE,
          notify_loan_insurance BOOLEAN DEFAULT FALSE,
          preferred_language VARCHAR(10) DEFAULT 'en',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_officer_settings_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 13. Notifications table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          farmer_id VARCHAR(64),
          type VARCHAR(50),
          category VARCHAR(50) DEFAULT 'ALERT',
          priority VARCHAR(20) DEFAULT 'HIGH',
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          body JSON,
          voice_text TEXT,
          language VARCHAR(10) DEFAULT 'en',
          action_label VARCHAR(100),
          action_url VARCHAR(255),
          action_status VARCHAR(50) DEFAULT 'not_required',
          source_feature VARCHAR(100),
          source_entity_id VARCHAR(100),
          correlation_id VARCHAR(100),
          is_read BOOLEAN DEFAULT FALSE,
          read_at DATETIME,
          channel VARCHAR(50) DEFAULT 'IN_APP',
          status VARCHAR(50) DEFAULT 'PENDING',
          provider VARCHAR(50),
          provider_message_id VARCHAR(100),
          risk_score INT,
          reason TEXT,
          retry_count INT DEFAULT 0,
          last_error TEXT,
          sent_at DATETIME,
          delivered_at DATETIME,
          failed_at DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure new columns are present if table already existed
      try {
        await connection.query(`
          ALTER TABLE notifications 
          ADD COLUMN channel VARCHAR(50) DEFAULT 'IN_APP',
          ADD COLUMN status VARCHAR(50) DEFAULT 'PENDING',
          ADD COLUMN provider VARCHAR(50),
          ADD COLUMN provider_message_id VARCHAR(100),
          ADD COLUMN risk_score INT,
          ADD COLUMN reason TEXT,
          ADD COLUMN retry_count INT DEFAULT 0,
          ADD COLUMN last_error TEXT,
          ADD COLUMN sent_at DATETIME,
          ADD COLUMN delivered_at DATETIME,
          ADD COLUMN failed_at DATETIME;
        `);
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          console.warn('[Database] Alter table notifications (SMS columns) warning:', e.message);
        }
      }
      try {
        await connection.query(`
          ALTER TABLE notifications 
          ADD COLUMN farmer_id VARCHAR(64),
          ADD COLUMN type VARCHAR(50),
          ADD COLUMN body JSON,
          ADD COLUMN voice_text TEXT,
          ADD COLUMN language VARCHAR(10) DEFAULT 'en',
          ADD COLUMN action_label VARCHAR(100),
          ADD COLUMN action_status VARCHAR(50) DEFAULT 'not_required',
          ADD COLUMN source_feature VARCHAR(100),
          ADD COLUMN source_entity_id VARCHAR(100),
          ADD COLUMN correlation_id VARCHAR(100),
          ADD COLUMN read_at DATETIME;
        `);
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          console.warn('[Database] Alter table notifications (Base columns) warning:', e.message);
        }
      }

      return true;
    } finally {
      connection.release();
    }
  } catch (err: any) {
    console.warn('[Database] AWS RDS Connection/Init notice:', err?.message || err);
    return false;
  }
}
