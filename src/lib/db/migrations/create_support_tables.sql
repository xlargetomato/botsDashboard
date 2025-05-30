-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  sender_id INT NOT NULL,
  message_type ENUM('text', 'image', 'file') DEFAULT 'text',
  content TEXT NOT NULL,
  file_url VARCHAR(255) NULL,
  file_name VARCHAR(255) NULL,
  file_type VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
