import { executeQuery } from '@/lib/db/config';
import fs from 'fs';
import path from 'path';

export async function createSupportTables() {
  try {
    console.log('Creating support tables if they do not exist...');
    
    // Create support_tickets table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('open', 'closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create support_messages table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id VARCHAR(36) PRIMARY KEY,
        ticket_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        message_type ENUM('text', 'image', 'file') DEFAULT 'text',
        content TEXT NOT NULL,
        file_url VARCHAR(255) NULL,
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL,
        is_seen BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Support tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating support tables:', error);
    throw error;
  }
}
