-- Create bot responses table
CREATE TABLE IF NOT EXISTS bot_responses (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  trigger_text VARCHAR(255) NOT NULL,
  response_text TEXT NOT NULL,
  response_type ENUM('text', 'image', 'video', 'audio', 'document') DEFAULT 'text',
  media_url VARCHAR(255) DEFAULT NULL,
  conditions_json JSON DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE
);

-- Create bot settings table for AI settings and welcome messages
CREATE TABLE IF NOT EXISTS bot_settings (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  config_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE
);

-- Create bot working hours table
CREATE TABLE IF NOT EXISTS bot_working_hours (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  day_of_week INT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
  from_time TIME NOT NULL,
  to_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE
);

-- Create bot block rules table
CREATE TABLE IF NOT EXISTS bot_block_rules (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  pattern VARCHAR(255) NOT NULL,
  block_message VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE
);

-- Create whatsapp_messages table for message history
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY,
  bot_id VARCHAR(36) NOT NULL,
  sender VARCHAR(255) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  message_text TEXT,
  media_url VARCHAR(255) DEFAULT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE
); 