import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';

// Migration script to ensure FAQs table has the correct multilingual fields
export async function GET(request) {
  try {
    console.log('Starting FAQs table migration...');
    
    // Check if the faqs table exists
    const tables = await executeQuery("SHOW TABLES LIKE 'faqs'");
    
    if (tables.length === 0) {
      // Create the table if it doesn't exist
      console.log('FAQs table does not exist, creating it');
      
      await executeQuery(`
        CREATE TABLE faqs (
          id VARCHAR(36) PRIMARY KEY,
          question_en VARCHAR(255) NOT NULL,
          question_ar VARCHAR(255) NOT NULL,
          answer_en TEXT NOT NULL,
          answer_ar TEXT NOT NULL,
          order_index INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('FAQs table created successfully');
    } else {
      console.log('FAQs table exists, checking schema');
      
      // Check if the table has the multilingual fields
      const columns = await executeQuery('SHOW COLUMNS FROM faqs');
      const columnNames = columns.map(col => col.Field);
      
      // Check if we need to migrate from single language to multilingual
      if (columnNames.includes('question') && !columnNames.includes('question_en')) {
        console.log('Migrating from single language to multilingual schema');
        
        // Backup existing data
        const existingFaqs = await executeQuery('SELECT * FROM faqs');
        
        // Create temporary table
        await executeQuery('CREATE TABLE faqs_temp LIKE faqs');
        
        // Add new columns to temporary table
        await executeQuery(`
          ALTER TABLE faqs_temp
          ADD COLUMN question_en VARCHAR(255) NOT NULL AFTER id,
          ADD COLUMN question_ar VARCHAR(255) NOT NULL AFTER question_en,
          ADD COLUMN answer_en TEXT NOT NULL AFTER question_ar,
          ADD COLUMN answer_ar TEXT NOT NULL AFTER answer_en,
          DROP COLUMN question,
          DROP COLUMN answer
        `);
        
        // Migrate existing data
        for (const faq of existingFaqs) {
          await executeQuery(
            `INSERT INTO faqs_temp (id, question_en, question_ar, answer_en, answer_ar, order_index, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              faq.id,
              faq.question,  // Copy existing question to both languages
              faq.question,
              faq.answer,    // Copy existing answer to both languages
              faq.answer,
              faq.order_index,
              faq.is_active,
              faq.created_at,
              faq.updated_at
            ]
          );
        }
        
        // Replace original table
        await executeQuery('DROP TABLE faqs');
        await executeQuery('RENAME TABLE faqs_temp TO faqs');
        
        console.log('Migration completed successfully');
      } else if (!columnNames.includes('question_en')) {
        // Handle case where table exists but doesn't have the expected columns
        console.log('FAQs table exists but needs multilingual columns');
        
        // Drop and recreate the table (assuming it's empty or can be recreated)
        await executeQuery('DROP TABLE faqs');
        
        await executeQuery(`
          CREATE TABLE faqs (
            id VARCHAR(36) PRIMARY KEY,
            question_en VARCHAR(255) NOT NULL,
            question_ar VARCHAR(255) NOT NULL,
            answer_en TEXT NOT NULL,
            answer_ar TEXT NOT NULL,
            order_index INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        console.log('FAQs table recreated with multilingual fields');
      } else {
        console.log('FAQs table already has the correct schema');
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'FAQs table migration completed successfully'
    });
  } catch (error) {
    console.error('Error migrating FAQs table:', error);
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error.message}`
    }, { status: 500 });
  }
}