import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST: Close a support ticket from client side
 * This allows clients to close their own tickets
 */
export async function POST(request) {
  try {
    // Verify user authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId;
    const { ticketId } = await request.json();
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Check if the ticket exists and belongs to the current user
    const tickets = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );

    if (tickets.length === 0) {
      return NextResponse.json({ error: 'Ticket not found or does not belong to you' }, { status: 404 });
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
        id, ticket_id, sender_id, sender_type, message_type, content
      ) VALUES (?, ?, ?, 'user', 'text', ?)`,
      [
        messageId, 
        ticketId, 
        userId, 
        'This ticket has been closed by the client.'
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
