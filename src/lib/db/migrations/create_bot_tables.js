import { executeQuery } from '../config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createBotTables() {
  try {
    // Read the SQL file
    const sqlFile = await fs.readFile(
      path.join(__dirname, 'create_bot_tables.sql'),
      'utf8'
    );

    // Split the SQL file into individual statements
    const statements = sqlFile
      .split(';')
      .filter(statement => statement.trim())
      .map(statement => statement.trim() + ';');

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await executeQuery(statement);
      }
    }

    console.log('Bot tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating bot tables:', error);
    throw error;
  }
}

export default createBotTables; 