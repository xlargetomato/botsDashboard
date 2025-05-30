// Script to migrate the FAQ table schema to support multilingual content
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'variable', // Hardcoded from .env file
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function executeQuery(pool, query, params = []) {
  try {
    if (params.length > 0) {
      const [results] = await pool.execute(query, params);
      return results;
    } else {
      const [results] = await pool.query(query);
      return results;
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function migrateFaqsTable() {
  let pool;
  
  try {
    console.log('Starting FAQs table migration...');
    console.log('Connecting to database with config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    // Create connection pool
    pool = mysql.createPool(dbConfig);
    
    // Check if the faqs table exists
    const tables = await executeQuery(pool, "SHOW TABLES LIKE 'faqs'");
    
    if (tables.length === 0) {
      // Create the table if it doesn't exist
      console.log('FAQs table does not exist, creating it');
      
      await executeQuery(pool, `
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
      const columns = await executeQuery(pool, 'SHOW COLUMNS FROM faqs');
      const columnNames = columns.map(col => col.Field);
      
      console.log('Current columns:', columnNames);
      
      // Check if we need to migrate from single language to multilingual
      if (columnNames.includes('question') && !columnNames.includes('question_en')) {
        console.log('Migrating from single language to multilingual schema');
        
        // Backup existing data
        const existingFaqs = await executeQuery(pool, 'SELECT * FROM faqs');
        console.log(`Found ${existingFaqs.length} existing FAQs to migrate`);
        
        // Drop the table and recreate with new schema
        await executeQuery(pool, 'DROP TABLE faqs');
        
        await executeQuery(pool, `
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
        
        // Migrate existing data
        for (const faq of existingFaqs) {
          await executeQuery(
            pool,
            `INSERT INTO faqs (id, question_en, question_ar, answer_en, answer_ar, order_index, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              faq.id,
              faq.question,  // Copy existing question to both languages
              faq.question,
              faq.answer,    // Copy existing answer to both languages
              faq.answer,
              faq.order_index || 0,
              faq.is_active || 1,
              faq.created_at || new Date(),
              faq.updated_at || new Date()
            ]
          );
        }
        
        console.log('Migration completed successfully');
      } else if (!columnNames.includes('question_en')) {
        // Handle case where table exists but doesn't have the expected columns
        console.log('FAQs table exists but needs multilingual columns');
        
        // Drop and recreate the table (assuming it's empty or can be recreated)
        await executeQuery(pool, 'DROP TABLE faqs');
        
        await executeQuery(pool, `
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
    
    console.log('FAQs table migration completed successfully');
  } catch (error) {
    console.error('Error migrating FAQs table:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
migrateFaqsTable().catch(console.error);
