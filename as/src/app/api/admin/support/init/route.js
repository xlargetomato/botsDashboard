import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// Headers for all responses
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

// Function to check if a column exists in a table
async function columnExists(table, column) {
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE 
        TABLE_NAME = ? 
        AND COLUMN_NAME = ?
        AND TABLE_SCHEMA = DATABASE()
    `, [table, column]);
    
    return result[0].count > 0;
  } catch (error) {
    console.error(`Error checking if column ${column} exists in ${table}:`, error);
    return false;
  }
}

export async function GET(request) {
  try {
    // Check if is_seen column exists in support_messages table
    const isSeenExists = await columnExists('support_messages', 'is_seen');
    if (!isSeenExists) {
      try {
        await executeQuery(`
          ALTER TABLE support_messages 
          ADD COLUMN is_seen BOOLEAN DEFAULT FALSE
        `);
        console.log('Added is_seen column to support_messages table');
      } catch (error) {
        console.error('Error adding is_seen column:', error);
      }
    }
    
    // Check if is_admin column exists in support_messages table
    const isAdminExists = await columnExists('support_messages', 'is_admin');
    if (!isAdminExists) {
      try {
        await executeQuery(`
          ALTER TABLE support_messages 
          ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
        `);
        console.log('Added is_admin column to support_messages table');
      } catch (error) {
        console.error('Error adding is_admin column:', error);
      }
    }
    
    // Update existing messages to set is_admin based on sender_id
    try {
      // First, get all admin user IDs
      const adminUsers = await executeQuery(`
        SELECT id FROM users WHERE role = 'admin'
      `);
      
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map(admin => admin.id);
        const adminPlaceholders = adminIds.map(() => '?').join(',');
        
        // Update messages where sender is an admin
        await executeQuery(`
          UPDATE support_messages 
          SET is_admin = TRUE 
          WHERE sender_id IN (${adminPlaceholders})
        `, adminIds);
        
        console.log('Updated is_admin flag for existing messages');
      }
    } catch (error) {
      console.error('Error updating is_admin for existing messages:', error);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Support chat system initialized successfully',
      schema: {
        is_seen_added: !isSeenExists,
        is_admin_added: !isAdminExists
      }
    }, { headers });
  } catch (error) {
    console.error('Error initializing support chat system:', error);
    return NextResponse.json(
      { error: 'Internal server error during initialization' },
      { status: 500, headers }
    );
  }
}
