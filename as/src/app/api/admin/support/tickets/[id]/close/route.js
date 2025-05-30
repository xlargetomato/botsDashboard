import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// POST: Close a support ticket
export async function POST(request, { params }) {
  try {
    // Get the cookie from the request headers
    const cookieStore = cookies();
    const token = (await cookieStore.get('auth_token'))?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Check if the ticket exists
    const tickets = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if the ticket is already closed
    if (tickets[0].status === 'closed') {
      return NextResponse.json({ error: 'Ticket is already closed' }, { status: 400 });
    }

    // Update the ticket status to closed
    await executeQuery(
      `UPDATE support_tickets 
       SET status = 'closed', 
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [ticketId]
    );
    
    // Add a system message about ticket closure
    const messageId = uuidv4();
    await executeQuery(
      `INSERT INTO support_messages (
        id, ticket_id, sender_id, message_type, content
      ) VALUES (?, ?, ?, 'text', ?)`,
      [
        messageId, 
        ticketId, 
        authResult.userId, 
        'This ticket has been closed by the support team.'
      ]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Ticket closed successfully'
    });
  } catch (error) {
    console.error('Error closing support ticket:', error);
    return NextResponse.json({ error: 'Failed to close ticket' }, { status: 500 });
  }
}
