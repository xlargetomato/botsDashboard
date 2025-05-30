import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.NEXT_PUBLIC_PROJECT_NAME?.toLowerCase() || 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000, // 60 seconds timeout
  // SSL configuration for Aiven MySQL
  ssl: process.env.DB_SSL === 'REQUIRED' ? {
    rejectUnauthorized: true
  } : false
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Function to execute database queries
export async function executeQuery(query, params = []) {
  try {
    if (params.length > 0) {
      const [results] = await pool.execute(query, params);
      return results;
    } else {
      // Use query() for DDL statements without parameters
      const [results] = await pool.query(query);
      return results;
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    // Check if database exists, if not create it
    await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    
    // Use the database
    await pool.query(`USE ${dbConfig.database}`);

    // Create users table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expires DATETIME,
        reset_token VARCHAR(255),
        reset_token_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        plan_id VARCHAR(36) NOT NULL,
        subscription_type ENUM('weekly', 'monthly', 'yearly') NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        started_date DATETIME NOT NULL,
        expired_date DATETIME NOT NULL,
        status ENUM('active', 'expired', 'canceled', 'blocked') NOT NULL DEFAULT 'active',
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        promo_code VARCHAR(50),
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create subscription plans table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_weekly DECIMAL(10, 2) NOT NULL,
        price_monthly DECIMAL(10, 2) NOT NULL,
        price_yearly DECIMAL(10, 2) NOT NULL,
        features JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create payment transactions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        subscription_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
      )
    `);

    // Create promo codes table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type ENUM('percentage', 'fixed') NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        valid_from DATETIME NOT NULL,
        valid_until DATETIME NOT NULL,
        max_uses INT DEFAULT NULL,
        current_uses INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('open', 'closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id VARCHAR(36) PRIMARY KEY,
        ticket_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        message_type ENUM('text', 'image', 'file') DEFAULT 'text',
        content TEXT NOT NULL,
        file_url VARCHAR(255) NULL,
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL,
        is_seen BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )
`);

    // Create FAQs table with multilingual support
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR(36) PRIMARY KEY,
        question_en VARCHAR(255) NOT NULL,
        question_ar VARCHAR(255) NOT NULL,
        answer_en TEXT NOT NULL,
        answer_ar TEXT NOT NULL,
        order_index INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);


    
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export default pool;
