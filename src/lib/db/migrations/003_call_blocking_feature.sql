-- Create table to store call events
CREATE TABLE IF NOT EXISTS whatsapp_calls (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  bot_id VARCHAR(36) NOT NULL,
  caller_jid VARCHAR(255) NOT NULL,
  call_id VARCHAR(255) NOT NULL,
  call_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  call_status ENUM('received', 'rejected', 'blocked', 'missed') NOT NULL DEFAULT 'received',
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE,
  INDEX idx_caller_jid (caller_jid),
  INDEX idx_bot_id (bot_id),
  INDEX idx_call_timestamp (call_timestamp)
);

-- Create table to store blocked contacts
CREATE TABLE IF NOT EXISTS whatsapp_blocked_contacts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  bot_id VARCHAR(36) NOT NULL,
  contact_jid VARCHAR(255) NOT NULL,
  reason VARCHAR(255),
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bot_contact (bot_id, contact_jid),
  INDEX idx_bot_id (bot_id),
  INDEX idx_is_active (is_active)
);

-- Create table to store call blocking settings
CREATE TABLE IF NOT EXISTS call_blocking_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  bot_id VARCHAR(36) NOT NULL,
  auto_reply_message TEXT NOT NULL DEFAULT 'Sorry, your call has been blocked.',
  daily_call_limit INT NOT NULL DEFAULT 3,
  block_type ENUM('temporary', 'permanent') DEFAULT 'temporary',
  is_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bot_settings (bot_id)
); 