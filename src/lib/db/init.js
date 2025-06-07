const { executeQuery } = require('./config');
const { initializeDatabase: runMigrations } = require('./migrationRunner');

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Run legacy initialization first (direct table creation/modification)
    // Fix payment_transactions table schema
    await executeQuery(`
      ALTER TABLE payment_transactions
        ADD COLUMN IF NOT EXISTS transaction_no VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS order_number VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS plan_id VARCHAR(36) NULL,
        ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(36) NULL,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    console.log('Updated payment_transactions table schema');

    // Add indexes for payment_transactions
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_transaction_no ON payment_transactions(transaction_no)
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_order_number ON payment_transactions(order_number)
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_subscription_id ON payment_transactions(subscription_id)
    `);
    console.log('Added indexes to payment_transactions table');

    // Fix subscriptions table schema
    await executeQuery(`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS plan_id VARCHAR(36) NOT NULL,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    console.log('Updated subscriptions table schema');

    // Add indexes for subscriptions
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_plan_id ON subscriptions(plan_id)
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_transaction_id ON subscriptions(transaction_id)
    `);
    console.log('Added indexes to subscriptions table');

    // Add foreign key constraints
    try {
      await executeQuery(`
        ALTER TABLE payment_transactions
        ADD CONSTRAINT fk_payment_subscription
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
        ON DELETE SET NULL
      `);
      console.log('Added foreign key constraint to payment_transactions');
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        throw error;
      }
      console.log('Foreign key constraint already exists on payment_transactions');
    }

    try {
      await executeQuery(`
        ALTER TABLE subscriptions
        ADD CONSTRAINT fk_subscription_plan
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
        ON DELETE RESTRICT
      `);
      console.log('Added foreign key constraint to subscriptions');
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        throw error;
      }
      console.log('Foreign key constraint already exists on subscriptions');
    }

    // Create tier_features table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tier_features (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tier_id INT NOT NULL,
        feature_key VARCHAR(50) NOT NULL,
        feature_value JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_tier_feature (tier_id, feature_key)
      )
    `);
    console.log('Created tier_features table');

    // Run new migrations for bot-related tables
    console.log('Running new migrations...');
    await runMigrations();

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export the initialization function
module.exports = {
  initializeDatabase
};

// If this file is run directly (not imported as a module), run the initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}
