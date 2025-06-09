import fs from 'fs/promises';
import path from 'path';
import { executeQuery } from '@/lib/db/config';

export async function createWhatsAppMessagesTable() {
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', 'whatsapp_messages.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    // Execute the SQL
    await executeQuery(sql);
    
    console.log('WhatsApp messages table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating WhatsApp messages table:', error);
    return false;
  }
} 