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
const executeQuery = async (query, params = []) => {
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
};

// Initialize database tables if they don't exist
const initializeDatabase = async () => {
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

    // Create payment transactions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        subscription_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        order_number VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL,
        last_four_digits VARCHAR(4),
        paylink_invoice_id VARCHAR(255),
        paylink_reference VARCHAR(255),
        payment_gateway_response JSON,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_order_number (order_number),
        INDEX idx_paylink_invoice_id (paylink_invoice_id),
        INDEX idx_paylink_reference (paylink_reference),
        INDEX idx_combined_lookup (transaction_id, order_number, paylink_invoice_id, paylink_reference)
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

    // Create subscriptions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        plan_id VARCHAR(36) NOT NULL,
        subscription_type ENUM('weekly', 'monthly', 'yearly') NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        started_date DATETIME NOT NULL,
        expired_date DATETIME NOT NULL,
        status ENUM('available', 'active', 'expired', 'canceled', 'blocked', 'pending') NOT NULL DEFAULT 'available',
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        promo_code VARCHAR(50),
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
      )
    `);

    // Add foreign key for subscription_id in payment_transactions after subscriptions table exists
    await executeQuery(`
      ALTER TABLE payment_transactions
      ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    `);

    // Create subscription history table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id VARCHAR(36) PRIMARY KEY,
        subscription_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export { pool, executeQuery, initializeDatabase };
