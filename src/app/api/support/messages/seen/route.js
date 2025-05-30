import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyToken } from '@/lib/auth/authUtils';
import { cookies } from 'next/headers';

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

// POST: Mark messages as seen
export async function POST(request) {
  try {
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers }
      );
    }

    const body = await request.json();
    const { ticketId, messageIds } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400, headers }
      );
    }

    // Verify ticket belongs to user or check if admin
    const [ticket] = await executeQuery(
      'SELECT * FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404, headers }
      );
    }

    // Check if user is ticket owner
    const isTicketOwner = ticket.user_id === auth.userId;
    
    // Check if user is admin
    const [user] = await executeQuery(
      'SELECT role FROM users WHERE id = ?',
      [auth.userId]
    );
    const isAdmin = user && user.role === 'admin';

    if (!isTicketOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to access this ticket' },
        { status: 403, headers }
      );
    }

    let updateQuery;
    let queryParams;

    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as seen
      const placeholders = messageIds.map(() => '?').join(',');
      updateQuery = `
        UPDATE support_messages 
        SET is_seen = TRUE 
        WHERE ticket_id = ? AND id IN (${placeholders})
      `;
      queryParams = [ticketId, ...messageIds];
    } else {
      // Mark all messages not from the current user as seen
      updateQuery = `
        UPDATE support_messages 
        SET is_seen = TRUE 
        WHERE ticket_id = ? AND sender_id != ?
      `;
      queryParams = [ticketId, auth.userId];
    }

    await executeQuery(updateQuery, queryParams);

    return NextResponse.json(
      { success: true, message: 'Messages marked as seen' },
      { headers }
    );
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}
