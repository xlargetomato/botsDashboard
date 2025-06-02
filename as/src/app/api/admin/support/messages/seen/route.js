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

// Helper function to check if a column exists in a table
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

export async function POST(request) {
  try {
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers }
      );
    }
    
    // Parse the request body as JSON
    const body = await request.json();
    const { ticketId, messageIds } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400, headers }
      );
    }
    
    // Check if is_seen column exists in support_messages table
    const isSeenExists = await columnExists('support_messages', 'is_seen');
    if (!isSeenExists) {
      // If the column doesn't exist, add it
      try {
        await executeQuery(`
          ALTER TABLE support_messages 
          ADD COLUMN is_seen BOOLEAN DEFAULT FALSE
        `);
        console.log('Added is_seen column to support_messages table');
      } catch (alterError) {
        console.error('Error adding is_seen column:', alterError);
        return NextResponse.json(
          { error: 'Database schema error. Please contact support.' },
          { status: 500, headers }
        );
      }
    }

    // If specific message IDs are provided, mark only those as seen
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      try {
        // Create placeholders for each ID
        const placeholders = messageIds.map(() => '?').join(',');
        
        // Prepare the parameters array
        const params = [ticketId, ...messageIds];
        
        console.log('Marking messages as seen:', {
          ticketId,
          messageIds,
          query: `UPDATE support_messages SET is_seen = TRUE WHERE ticket_id = ? AND id IN (${placeholders})`,
          params
        });
        
        // Execute the query
        const result = await executeQuery(
          `UPDATE support_messages 
           SET is_seen = TRUE 
           WHERE ticket_id = ? AND id IN (${placeholders})`,
          params
        );
        
        console.log('Update result:', result);
        
        return NextResponse.json({ 
          success: true,
          affectedRows: result.affectedRows || 0,
          messageIds
        }, { headers });
      } catch (queryError) {
        console.error('SQL error marking specific messages as seen:', queryError);
        return NextResponse.json(
          { error: 'Database error while marking messages as seen', details: queryError.message },
          { status: 500, headers }
        );
      }
    } else {
      // Otherwise mark all messages in the ticket as seen
      try {
        console.log('Marking all unseen messages as seen for ticket:', ticketId);
        
        const result = await executeQuery(
          `UPDATE support_messages 
           SET is_seen = TRUE 
           WHERE ticket_id = ? AND is_seen = FALSE`,
          [ticketId]
        );
        
        console.log('Update all result:', result);
        
        return NextResponse.json({ 
          success: true,
          affectedRows: result.affectedRows || 0
        }, { headers });
      } catch (queryError) {
        console.error('SQL error marking all messages as seen:', queryError);
        return NextResponse.json(
          { error: 'Database error while marking all messages as seen', details: queryError.message },
          { status: 500, headers }
        );
      }
    }

  } catch (error) {
    console.error('Error in messages/seen endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500, headers }
    );
  }
}
