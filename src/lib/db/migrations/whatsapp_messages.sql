-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  bot_id VARCHAR(36) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  media_url VARCHAR(1024),
  media_type VARCHAR(50),
  message_type VARCHAR(50) DEFAULT 'text',
  sent_at TIMESTAMP,
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES whatsapp_bots(id) ON DELETE CASCADE,
  INDEX idx_bot_id (bot_id),
  INDEX idx_recipient (recipient),
  INDEX idx_direction (direction),
  INDEX idx_status (status),
  INDEX idx_sent_at (sent_at),
  INDEX idx_received_at (received_at)
); 