import { executeQuery } from '../config';

export async function createPaymentMethodsTable() {
  try {
    // Create payment methods table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        method_type VARCHAR(50) NOT NULL,
        last_four_digits VARCHAR(4),
        card_brand VARCHAR(50),
        card_holder_name VARCHAR(100),
        expires_at VARCHAR(7),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Payment methods table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating payment methods table:', error);
    return false;
  }
}
