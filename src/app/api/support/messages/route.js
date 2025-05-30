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
      console.error('Authentication error:', auth.error);
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers }
      );
    }
    
    // Ensure support tables exist
    try {
      console.log('Ensuring support tables exist...');
      await createSupportTables();
      console.log('Support tables verified/created successfully');
    } catch (migrationError) {
      console.error('Error creating support tables:', migrationError);
      return NextResponse.json(
        { error: 'Failed to initialize support system' },
        { status: 500, headers }
      );
    }

    const { searchParams } = new URL(request.url);
    // Support both ticketId and ticket_id parameters for compatibility
    const ticketId = searchParams.get('ticketId') || searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400, headers }
      );
    }

    // Verify ticket belongs to user
    const [ticket] = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, auth.userId]
    );

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404, headers }
      );
    }

    let messages = [];
    try {
      console.log('Fetching messages for ticket:', ticketId);
      messages = await executeQuery(
        `SELECT m.*, u.name as sender_name, 
         CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as is_admin,
         u.id as user_id
         FROM support_messages m 
         JOIN users u ON m.sender_id = u.id 
         WHERE m.ticket_id = ? 
         ORDER BY m.created_at ASC`,
        [ticketId]
      );
      console.log(`Found ${messages.length} messages for ticket`, ticketId);
    } catch (messageError) {
      console.error('Error fetching messages:', messageError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500, headers }
      );
    }
    
    try {
      // Mark user's messages as seen when admin views them
      console.log('Updating message seen status for user:', auth.userId);
      await executeQuery(
        `UPDATE support_messages 
         SET is_seen = TRUE 
         WHERE ticket_id = ? AND sender_id = ? AND is_seen = FALSE`,
        [ticketId, auth.userId]
      );
    } catch (updateError) {
      console.error('Error updating message status:', updateError);
      // Continue even if we can't update the seen status
    }

    // Clean up and format message content before sending
    const formattedMessages = messages.map(message => {
      // Create a clean copy with timestamp and formatting issues fixed
      let cleanContent = message.content;
      
      if (cleanContent) {
        // Comprehensive pattern cleaning
        cleanContent = cleanContent
          // Remove various timestamp formats
          .replace(/e4e\^[AP]M\s*\d{2}:\d{2}/g, '')
          .replace(/\^[AP]M\s*\d{2}:\d{2}/g, '')
          .replace(/\b[AP]M\s*\d{2}:\d{2}\b/g, '')
          // Remove standalone markers
          .replace(/\be4e\^[AP]M\b/g, '')
          .replace(/\be4e\b/g, '')
          .replace(/\b\^[AP]M\b/g, '')
          // Remove any trailing numbers
          .replace(/\s\d{1,5}\s*$/g, '')
          .trim();
      }
      
      return {
        ...message,
        content: cleanContent,
        sender_type: message.is_admin ? 'admin' : 'user'
      };
    });
    
    // Return ticket information along with cleaned-up messages
    return NextResponse.json({ 
      messages: formattedMessages, 
      ticket: {
        id: ticket.id,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at
      } 
    }, { headers });
  } catch (error) {
    console.error('Error fetching messages:', error);
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

    // Parse the request body as JSON
    const body = await request.json();
    const ticketId = body.ticketId || body.ticket_id;
    const content = body.content;
    // Get file information if available
    const fileName = body.fileName;
    const fileType = body.fileType;
    const fileUrl = body.fileUrl;

    if (!ticketId || !content) {
      return NextResponse.json(
        { error: 'Ticket ID and content are required' },
        { status: 400, headers }
      );
    }

    // Verify ticket belongs to user
    const [ticket] = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, auth.userId]
    );

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404, headers }
      );
    }
    
    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot send messages to a closed ticket' },
        { status: 403, headers }
      );
    }

    const messageId = uuidv4();
    // Determine message type based on file information
    const messageType = fileType && fileType.startsWith('image/') ? 'image' : (fileName ? 'file' : 'text');

    // Add message
    await executeQuery(
      `INSERT INTO support_messages 
       (id, ticket_id, sender_id, message_type, content, file_url, file_name, file_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, ticketId, auth.userId, messageType, content, fileUrl || null, fileName || null, fileType || null]
    );

    // Update ticket timestamp
    await executeQuery(
      'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [ticketId]
    );

    // Get the created message with sender info
    const [message] = await executeQuery(
      `SELECT m.*, u.name as sender_name, 
       CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END as is_admin,
       u.id as user_id
       FROM support_messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.id = ?`,
      [messageId]
    );

    return NextResponse.json({ message }, { headers });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}
