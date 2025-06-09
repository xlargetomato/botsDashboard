import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { resetBotConnection } from '@/lib/whatsapp/connection';

export async function POST(request, { params }) {
  try {
    // Get bot ID from params using destructuring
    const { botId } = params;
    
    // Validate bot ID
    if (!botId) {
      return NextResponse.json({ error: 'Missing bot ID' }, { status: 400 });
    }
    
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First verify the bot belongs to the user
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
    
    // Reset the WhatsApp connection
    const success = await resetBotConnection(botId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp connection reset successfully. Please scan the QR code to reconnect.'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to reset WhatsApp connection' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error resetting WhatsApp connection:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 