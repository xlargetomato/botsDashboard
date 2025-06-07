-- Fix payment_transactions table schema
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS transaction_no VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS plan_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_no ON payment_transactions(transaction_no);
CREATE INDEX IF NOT EXISTS idx_order_number ON payment_transactions(order_number);
CREATE INDEX IF NOT EXISTS idx_subscription_id ON payment_transactions(subscription_id);

-- Fix subscriptions table schema
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id VARCHAR(36) NOT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_transaction_id ON subscriptions(transaction_id);

-- Add foreign key constraints if they don't exist
ALTER TABLE payment_transactions
  ADD CONSTRAINT IF NOT EXISTS fk_payment_subscription
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
  ON DELETE SET NULL;

ALTER TABLE subscriptions
  ADD CONSTRAINT IF NOT EXISTS fk_subscription_plan
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
  ON DELETE RESTRICT; 