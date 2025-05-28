import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyToken } from '@/lib/auth/authUtils';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createSupportTables } from '@/lib/db/migrations/support';

// Headers for all responses
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

// Helper function to verify authentication
async function verifyAuth() {
  const cookieStore = cookies();
  const token = (await cookieStore.get('auth_token'))?.value;
  
  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }
  
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return { error: 'Invalid authentication token', status: 401 };
  }
  
  return { userId: decoded.userId };
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
    
    // Check if we should include unread message counts
    const { searchParams } = new URL(request.url);
    const includeUnread = searchParams.get('includeUnread') === 'true';
    
    // Ensure support tables exist
    try {
      await createSupportTables();
    } catch (migrationError) {
      console.error('Error creating support tables:', migrationError);
      // Continue anyway as we'll handle empty results
    }

    // Get tickets for the user with message counts
    let query = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
        (SELECT created_at FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_at
    `;
    
    // Add unread message counts if requested
    if (includeUnread) {
      query += `,
        (SELECT COUNT(*) FROM support_messages 
         WHERE ticket_id = t.id 
         AND sender_id != ? 
         AND is_seen = FALSE) as unread_admin_messages
      `;
    }
    
    query += `
      FROM support_tickets t 
      WHERE t.user_id = ? 
      ORDER BY t.status = 'open' DESC, t.updated_at DESC
    `;
    
    const params = includeUnread ? [auth.userId, auth.userId] : [auth.userId];
    const tickets = await executeQuery(query, params);

    return NextResponse.json({ tickets }, { headers });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
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
    
    // Ensure support tables exist
    try {
      await createSupportTables();
    } catch (migrationError) {
      console.error('Error creating support tables:', migrationError);
      // Continue anyway and let the database operations fail naturally if tables don't exist
    }

    const data = await request.json();
    const { subject, message } = data;

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400, headers }
      );
    }

    // Create new ticket
    const ticketId = uuidv4();
    const messageId = uuidv4();

    await executeQuery(
      'INSERT INTO support_tickets (id, user_id, subject) VALUES (?, ?, ?)',
      [ticketId, auth.userId, subject]
    );

    // Add initial message
    await executeQuery(
      'INSERT INTO support_messages (id, ticket_id, sender_id, content) VALUES (?, ?, ?, ?)',
      [messageId, ticketId, auth.userId, message]
    );

    // Get the created ticket
    const [ticket] = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    return NextResponse.json({ ticket }, { headers });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}

export async function PUT(request) {
  try {
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers }
      );
    }
    
    // Ensure support tables exist
    try {
      await createSupportTables();
    } catch (migrationError) {
      console.error('Error creating support tables:', migrationError);
      // Continue anyway and let the database operations fail naturally if tables don't exist
    }

    const data = await request.json();
    const { ticketId, status } = data;

    if (!ticketId || !status || !['open', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid ticket ID or status' },
        { status: 400, headers }
      );
    }

    // Update ticket status
    await executeQuery(
      'UPDATE support_tickets SET status = ?, closed_at = ? WHERE id = ? AND user_id = ?',
      [status, status === 'closed' ? new Date() : null, ticketId, auth.userId]
    );

    // Get updated ticket
    const [ticket] = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    return NextResponse.json({ ticket }, { headers });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}
