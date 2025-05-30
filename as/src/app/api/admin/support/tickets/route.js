import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { executeQuery } from '@/lib/db/config';

// GET: Fetch all support tickets for admin or tickets for a specific user
export async function GET(request) {
  try {
    // Check if we're looking for a specific user's tickets
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const isAdminRequest = request.headers.get('x-admin-access') === 'true';
    
    // For admin dashboard requests, we'll be more lenient with auth
    if (!isAdminRequest) {
      // Get the cookie from the request headers
      const cookieStore = cookies();
      const token = (await cookieStore.get('auth_token'))?.value;
      
      if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }
    
    // Build the query based on whether we're fetching for a specific user
    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
        (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = t.id) as last_message_at
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
    `;
    
    const queryParams = [];
    
    // Add WHERE clause if filtering by user
    if (userId) {
      query += ` WHERE t.user_id = ?`;
      queryParams.push(userId);
      console.log(`Fetching tickets for user ID: ${userId}`);
    }
    
    // Add ORDER BY clause
    query += ` ORDER BY t.created_at DESC`;
    
    // Fetch tickets with user information
    const tickets = await executeQuery(query, queryParams);

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// PUT: Update ticket status
export async function PUT(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: 'Ticket ID and status are required' }, { status: 400 });
    }

    // Update ticket status in the database
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const closedAt = status === 'closed' ? currentTime : null;
    
    const result = await executeQuery(
      `UPDATE support_tickets 
       SET status = ?, 
           updated_at = ?, 
           closed_at = ? 
       WHERE id = ?`,
      [status, currentTime, closedAt, ticketId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Ticket status updated successfully'
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
