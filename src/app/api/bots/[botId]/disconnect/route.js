import { NextResponse } from 'next/server';
import { closeBotConnection } from '@/lib/whatsapp/connection.js';
import { executeQuery } from '@/lib/db/config.js';

export async function POST(request, { params }) {
  try {
    // Get bot ID from params using destructuring
    const { botId } = params;
    
    // Validate bot ID
    if (!botId) {
      return NextResponse.json({ error: 'Missing bot ID' }, { status: 400 });
    }
    
    // Check if the bot exists
    const bots = await executeQuery(
      'SELECT * FROM whatsapp_bots WHERE id = ?',
      [botId]
    );
    
    if (bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    
    // Close the bot connection
    const success = await closeBotConnection(botId);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'WhatsApp session disconnected successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to disconnect WhatsApp session' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in bot disconnect endpoint:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 