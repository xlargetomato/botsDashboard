import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';
import { createSupportTables } from '@/lib/db/migrations/support';

// GET: Fetch messages for a specific ticket
export async function GET(request) {
  try {
    // Get the cookie from the request headers - properly awaited for Next.js 14
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure support tables exist
    try {
      await createSupportTables();
    } catch (migrationError) {
      console.error('Error creating support tables:', migrationError);
      // Continue anyway as we'll handle empty results
    }

    const { searchParams } = new URL(request.url);
    // Support both ticketId and ticket_id parameters for compatibility
    const ticketId = searchParams.get('ticketId') || searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Fetch user information for the ticket
    const [ticketInfo] = await executeQuery(
      `SELECT t.*, u.name, u.email 
       FROM support_tickets t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.id = ?`,
      [ticketId]
    );

    if (!ticketInfo) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const userInfo = {
      id: ticketInfo.user_id,
      name: ticketInfo.name,
      email: ticketInfo.email
    };

    // Fetch messages for the ticket with sender information
    const messages = await executeQuery(`
      SELECT m.*, 
        u.name as sender_name,
        CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as is_admin,
        u.id as user_id
      FROM support_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `, [ticketId]);

    return NextResponse.json({ messages, userInfo });
  } catch (error) {
    console.error('Error fetching support messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: Send a message in a ticket
export async function POST(request) {
  try {
    // Get the cookie from the request headers - properly awaited for Next.js 14
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure support tables exist
    try {
      await createSupportTables();
    } catch (migrationError) {
      console.error('Error creating support tables:', migrationError);
      // Continue anyway and let the database operations fail naturally if tables don't exist
    }

    // Parse the request body
    const body = await request.json();
    // Support both ticketId and ticket_id parameters for compatibility
    const ticketId = body.ticketId || body.ticket_id;
    const content = body.content;
    // Get file information if available
    const fileName = body.fileName;
    const fileType = body.fileType;
    const fileUrl = body.fileUrl;

    if (!ticketId || !content) {
      return NextResponse.json({ error: 'Ticket ID and content are required' }, { status: 400 });
    }

    // Check if the ticket exists
    const tickets = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Generate a UUID for the new message
    const messageId = uuidv4();
    
    // Determine message type based on file information
    const messageType = fileType && fileType.startsWith('image/') ? 'image' : (fileName ? 'file' : 'text');
    
    // Insert the new message into the database
    // Make sure to handle null/undefined values properly
    await executeQuery(
      `INSERT INTO support_messages (
        id, ticket_id, sender_id, message_type, content, file_url, file_name, file_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, ticketId, authResult.userId, messageType, content, fileUrl || null, fileName || null, fileType || null]
    );
    
    // Update the ticket's updated_at timestamp
    await executeQuery(
      `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [ticketId]
    );
    
    // Get the newly created message with sender information
    const [newMessage] = await executeQuery(
      `SELECT m.*, 
        u.name as sender_name,
        CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as is_admin,
        u.id as user_id
      FROM support_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?`,
      [messageId]
    );
    
    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('Error sending support message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
