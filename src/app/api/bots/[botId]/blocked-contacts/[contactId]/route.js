import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// Delete (unblock) a blocked contact
export async function DELETE(request, { params }) {
  try {
    // Get bot ID and contact ID from params
    const { botId, contactId } = params;
    
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the bot belongs to the user
    const botOwnership = await executeQuery(`
      SELECT 1
      FROM whatsapp_bots wb
      WHERE wb.id = ? AND wb.user_id = ?
    `, [botId, userId]);

    if (botOwnership.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if the blocked contact exists and belongs to the bot
    const contactExists = await executeQuery(`
      SELECT 1
      FROM whatsapp_blocked_contacts
      WHERE id = ? AND bot_id = ?
    `, [contactId, botId]);

    if (contactExists.length === 0) {
      return NextResponse.json(
        { error: 'Blocked contact not found' },
        { status: 404 }
      );
    }

    // Update the contact to inactive (unblock)
    await executeQuery(`
      UPDATE whatsapp_blocked_contacts
      SET is_active = FALSE
      WHERE id = ?
    `, [contactId]);

    return NextResponse.json({
      success: true,
      message: 'Contact unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking contact:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 