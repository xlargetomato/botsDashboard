import { NextResponse } from 'next/server';
import { sendMessage, getConnectionStatus } from '@/lib/whatsapp/connection.js';
import { executeQuery } from '@/lib/db/config.js';
import { createWhatsAppMessagesTable } from '@/lib/db/migrations/whatsapp.js';

export async function POST(request, { params }) {
  try {
    // Get bot ID from params
    const botId = params.botId;
    
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
    
    const bot = bots[0];
    
    // Check if bot is active
    if (bot.status !== 'active') {
      return NextResponse.json({ 
        error: 'Bot is not active. Please connect the bot first.' 
      }, { status: 400 });
    }
    
    // Parse request body
    const body = await request.json();
    const { recipient, message } = body;
    
    // Validate required fields
    if (!recipient) {
      return NextResponse.json({ error: 'Missing recipient phone number' }, { status: 400 });
    }
    
    if (!message) {
      return NextResponse.json({ error: 'Missing message content' }, { status: 400 });
    }
    
    // Check if bot is connected
    const status = getConnectionStatus(botId);
    if (!status.connected) {
      return NextResponse.json({ 
        error: 'Bot is not connected to WhatsApp. Please connect the bot first.' 
      }, { status: 400 });
    }
    
    // Send the message
    console.log(`Sending message from bot ${botId} to ${recipient}`);
    const success = await sendMessage(botId, recipient, message);
    
    if (success) {
      // Ensure the messages table exists
      await createWhatsAppMessagesTable();
      
      // Log the message to database
      try {
        await executeQuery(`
          INSERT INTO whatsapp_messages (
            bot_id, 
            recipient, 
            message, 
            direction, 
            status, 
            sent_at
          ) VALUES (?, ?, ?, 'outbound', 'sent', NOW())
        `, [botId, recipient, message]);
      } catch (dbError) {
        console.error('Error logging message to database:', dbError);
        // Continue even if logging fails
      }
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send message. Please try again.' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in send message endpoint:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 