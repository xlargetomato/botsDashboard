import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAdminToken } from '@/lib/auth/authUtils';
import { cookies } from 'next/headers';

// Headers for all responses
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

// Helper function to verify admin authentication
async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }
  
  const decoded = verifyAdminToken(token);
  if (!decoded || !decoded.userId || !decoded.isAdmin) {
    return { error: 'Admin authentication required', status: 403 };
  }
  
  return { userId: decoded.userId, isAdmin: true };
}

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
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers }
      );
    }
    
    // Check and add is_seen column if it doesn't exist
    const isSeenExists = await columnExists('support_messages', 'is_seen');
    if (!isSeenExists) {
      await executeQuery(`
        ALTER TABLE support_messages 
        ADD COLUMN is_seen BOOLEAN DEFAULT FALSE
      `);
      console.log('Added is_seen column to support_messages table');
    }
    
    // Check and add is_admin column if it doesn't exist
    const isAdminExists = await columnExists('support_messages', 'is_admin');
    if (!isAdminExists) {
      await executeQuery(`
        ALTER TABLE support_messages 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `);
      console.log('Added is_admin column to support_messages table');
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Database migration completed successfully',
      changes: {
        is_seen_added: !isSeenExists,
        is_admin_added: !isAdminExists
      }
    }, { headers });
  } catch (error) {
    console.error('Error during database migration:', error);
    return NextResponse.json(
      { error: 'Internal server error during migration' },
      { status: 500, headers }
    );
  }
}
