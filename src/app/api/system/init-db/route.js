import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { executeQuery } from '@/lib/db/config';

export async function POST(request) {
  try {
    // Execute base schema first
    await executeMigrationFile('001_create_bot_tables.sql', true);
    
    // Create bot_responses table with properly escaped trigger column
    try {
      await executeQuery(`
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
        )
      `);
    } catch (error) {
      console.error('Error creating bot_responses table:', error);
    }
    
    // Execute remaining migration files in order
    const migrationFiles = [
      '002_create_bot_responses_table.sql',
      '003_call_blocking_feature.sql',
      '004_add_chat_type_to_responses.sql'
    ];
    
    for (const file of migrationFiles) {
      await executeMigrationFile(file);
    }
    
    // Create the trigger separately (since DELIMITER causes issues)
    try {
      // Drop the trigger if it exists
      await executeQuery(`DROP TRIGGER IF EXISTS after_bot_insert`);
      
      // Create the trigger without using DELIMITER
      await executeQuery(`
        CREATE TRIGGER after_bot_insert
        AFTER INSERT ON whatsapp_bots
        FOR EACH ROW
        BEGIN
            DECLARE bot_count INT;
            DECLARE max_allowed INT;
            
            -- Get current bot count for the subscription
            SELECT COUNT(*) INTO bot_count
            FROM whatsapp_bots
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
        END
      `);
      console.log('Trigger created successfully');
    } catch (error) {
      console.error('Error creating trigger:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to execute a migration file
async function executeMigrationFile(filename, skipTriggers = false) {
  try {
    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon but ignore delimiter sections which will be handled separately
    const commands = migrationSQL.split(';')
      .filter(cmd => cmd.trim() !== '')
      .filter(cmd => {
        if (skipTriggers) {
          // Skip DELIMITER sections and trigger definitions
          return !cmd.includes('DELIMITER') && 
                 !cmd.includes('CREATE TRIGGER') && 
                 !cmd.includes('DROP TRIGGER');
        }
        return true;
      });
    
    for (const cmd of commands) {
      if (cmd.trim()) {
        try {
          await executeQuery(cmd);
        } catch (cmdError) {
          // Log error but continue with next command
          console.error(`Error executing command from ${filename}:`, cmdError);
        }
      }
    }
    
    console.log(`Migration ${filename} executed successfully`);
  } catch (error) {
    console.error(`Error running migration ${filename}:`, error);
  }
}