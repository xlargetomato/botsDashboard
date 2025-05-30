import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';

export async function POST(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ticket ID from request body
    const body = await request.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // First, delete all messages associated with the ticket
    await executeQuery(
      'DELETE FROM support_messages WHERE ticket_id = ?',
      [ticketId]
    );
    
    // Then delete the ticket itself
    const result = await executeQuery(
      'DELETE FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Ticket and associated messages deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
