import { executeQuery } from '../config';

// Function to create the subscriptions-related tables
export async function createSubscriptionsTable() {
  try {
    // Create subscription plans table first
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
    
    // Then create subscriptions table with proper foreign key
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Subscription plans table is already created above

    // Create payment transactions table with enhanced fields for payment gateways
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        subscription_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL,
        last_four_digits VARCHAR(4),
        paylink_invoice_id VARCHAR(255),
        paylink_reference VARCHAR(255),
        payment_gateway_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create subscription history table to track all subscription events
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id VARCHAR(36) PRIMARY KEY,
        subscription_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert some sample subscription plans if none exist
    const existingPlans = await executeQuery('SELECT COUNT(*) as count FROM subscription_plans');
    
    if (existingPlans[0].count === 0) {
      // Basic plan
      await executeQuery(`
        INSERT INTO subscription_plans 
        (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
        VALUES 
        (UUID(), 'Basic Plan', 'Essential features for small businesses', 49.99, 99.99, 999.99, ?, TRUE)
      `, [JSON.stringify(['5 Projects', '10 GB Storage', 'Basic Support'])]);
      
      // Pro plan
      await executeQuery(`
        INSERT INTO subscription_plans 
        (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
        VALUES 
        (UUID(), 'Pro Plan', 'Advanced features for growing businesses', 99.99, 199.99, 1999.99, ?, TRUE)
      `, [JSON.stringify(['20 Projects', '50 GB Storage', 'Priority Support', 'Advanced Analytics'])]);
      
      // Enterprise plan
      await executeQuery(`
        INSERT INTO subscription_plans 
        (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
        VALUES 
        (UUID(), 'Enterprise Plan', 'Comprehensive solution for large organizations', 199.99, 499.99, 4999.99, ?, TRUE)
      `, [JSON.stringify(['Unlimited Projects', '200 GB Storage', 'Priority Support', 'Advanced Analytics', 'Custom Integrations'])]);
    }
    
    console.log('Subscriptions tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating subscriptions tables:', error);
    return false;
  }
}