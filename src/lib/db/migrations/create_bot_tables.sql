-- Add new columns to subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_bots_allowed INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration_in_days INT GENERATED ALWAYS AS (
  CASE 
    WHEN subscription_type = 'weekly' THEN 7
    WHEN subscription_type = 'monthly' THEN 30
    WHEN subscription_type = 'yearly' THEN 365
  END
) STORED;

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  whatsapp_session JSON,
  activated_at DATETIME,
  expires_at DATETIME,
  status ENUM('pending', 'active', 'expired', 'deactivated') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- Create bot_features table
CREATE TABLE IF NOT EXISTS bot_features (
  id VARCHAR(36) PRIMARY KEY,
  plan_id VARCHAR(36) NOT NULL,
  feature_key VARCHAR(50) NOT NULL,
  feature_value JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
  UNIQUE KEY unique_plan_feature (plan_id, feature_key)
);

-- Create bot_working_hours table
CREATE TABLE IF NOT EXISTS bot_working_hours (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  from_time TIME NOT NULL,
  to_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bot_day (bot_id, day_of_week)
);

-- Create bot_block_rules table
CREATE TABLE IF NOT EXISTS bot_block_rules (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  pattern VARCHAR(255) NOT NULL,
  block_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Create bot_settings table
CREATE TABLE IF NOT EXISTS bot_settings (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  config_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Create bot_responses table
CREATE TABLE IF NOT EXISTS bot_responses (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  trigger VARCHAR(255) NOT NULL,
  response_text TEXT NOT NULL,
  response_type ENUM('text', 'image', 'buttons', 'list', 'location', 'contact') NOT NULL DEFAULT 'text',
  media_url VARCHAR(255),
  conditions_json JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_bot_status ON bots(status);
CREATE INDEX idx_bot_user ON bots(user_id);
CREATE INDEX idx_bot_subscription ON bots(subscription_id);
CREATE INDEX idx_bot_responses_trigger ON bot_responses(trigger);
CREATE INDEX idx_bot_block_rules_pattern ON bot_block_rules(pattern);

-- Add trigger to maintain bot count per subscription
DELIMITER //

CREATE TRIGGER after_bot_insert
AFTER INSERT ON bots
FOR EACH ROW
BEGIN
    DECLARE bot_count INT;
    DECLARE max_allowed INT;
    
    -- Get current bot count for the subscription
    SELECT COUNT(*) INTO bot_count
    FROM bots
    WHERE subscription_id = NEW.subscription_id;
    
    -- Get max allowed bots for the subscription plan
    SELECT max_bots_allowed INTO max_allowed
    FROM subscription_plans
    WHERE id = NEW.plan_id;
    
    -- Check if limit exceeded
    IF bot_count > max_allowed THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Maximum number of bots exceeded for this subscription';
    END IF;
END //

DELIMITER ; 