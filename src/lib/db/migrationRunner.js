import { executeQuery } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create migrations table if it doesn't exist
async function initMigrationsTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_migration_name (name)
    )
  `);
}

// Get list of executed migrations
async function getExecutedMigrations() {
  const result = await executeQuery('SELECT name FROM migrations ORDER BY executed_at');
  return result.map(row => row.name);
}

// Get list of migration files
async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = await fs.readdir(migrationsDir);
  return files
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure migrations run in order
}

// Execute a single migration
async function executeMigration(migrationName) {
  const migrationPath = path.join(__dirname, 'migrations', migrationName);
  const sql = await fs.readFile(migrationPath, 'utf8');

  // Split the SQL file into individual statements
  const statements = sql
    .split(';')
    .filter(statement => statement.trim())
    .map(statement => statement.trim());

  // Execute each statement
  for (const statement of statements) {
    if (statement.includes('DELIMITER')) {
      // Handle DELIMITER statements differently
      const triggerStatements = statement.split('DELIMITER');
      for (const triggerStmt of triggerStatements) {
        if (triggerStmt.trim()) {
          await executeQuery(triggerStmt);
        }
      }
    } else if (statement) {
      await executeQuery(statement);
    }
  }

  // Record the migration
  await executeQuery(
    'INSERT INTO migrations (id, name) VALUES (UUID(), ?)',
    [migrationName]
  );
}

// Run all pending migrations
async function runMigrations() {
  console.log('Starting database migrations...');

  // Initialize migrations table
  await initMigrationsTable();

  // Get lists of migrations
  const executedMigrations = await getExecutedMigrations();
  const migrationFiles = await getMigrationFiles();

  // Find pending migrations
  const pendingMigrations = migrationFiles.filter(
    file => !executedMigrations.includes(file)
  );

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  // Execute pending migrations
  for (const migration of pendingMigrations) {
    console.log(`Executing migration: ${migration}`);
    await executeMigration(migration);
    console.log(`Completed migration: ${migration}`);
  }

  console.log('All migrations completed successfully.');
}

// Sanity check function
async function performSanityCheck() {
  console.log('Performing database sanity check...');

  // Check database connection
  try {
    await executeQuery('SELECT 1');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }

  // Get list of tables
  const tables = await executeQuery(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
  `);

  console.log('\nExisting tables:');
  tables.forEach(({ table_name }) => {
    console.log(`- ${table_name}`);
  });

  // Check required tables exist
  const requiredTables = [
    'whatsapp_bots',
    'bot_features',
    'bot_working_hours',
    'bot_block_rules',
    'bot_settings',
    'bot_responses'
  ];

  const missingTables = requiredTables.filter(
    table => !tables.some(t => t.table_name === table)
  );

  if (missingTables.length > 0) {
    console.error('\n✗ Missing required tables:', missingTables);
    throw new Error('Missing required tables');
  }

  console.log('\n✓ All required tables exist');
  console.log('✓ Database sanity check completed successfully');
}

// Main function to run migrations and perform sanity check
export async function initializeDatabase() {
  try {
    await runMigrations();
    await performSanityCheck();
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Export functions
export default {
  initializeDatabase,
  runMigrations,
  performSanityCheck
};

// If this file is run directly, run the initialization
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
} 