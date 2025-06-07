import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config.js';
import { initWhatsAppConnection, getConnectionStatus, getBotError, resetBotConnection } from '@/lib/whatsapp/connection.js';

// Allow server to take some time to generate QR
export const maxDuration = 120;

// Endpoint to get QR code for a bot
export async function GET(request, { params }) {
  try {
    // Properly handle params by awaiting them
    const botId = params.botId;
    const searchParams = request.nextUrl.searchParams;
    const forcereset = searchParams.get('forcereset');
    const isPoll = searchParams.get('poll');
    const timestamp = searchParams.get('t');
    
    // Validate bot ID - accept UUID format or numeric IDs
    if (!botId) {
      return NextResponse.json({ error: 'Missing bot ID' }, { status: 400 });
    }
    
    console.log(`QR request for bot ${botId}${forcereset ? ' (force reset)' : ''}${isPoll ? ' (polling)' : ''} at ${timestamp}`);
    
    // Check if the bot exists
    const bots = await executeQuery(
      'SELECT * FROM whatsapp_bots WHERE id = ?',
      [botId]
    );
    
    if (bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    
    const bot = bots[0];
    
    // Check if bot is already active
    if (bot.status === 'active' && bot.whatsapp_session) {
      return NextResponse.json({ active: true });
    }
    
    // If a force reset is requested, reset the connection
    if (forcereset === 'true') {
      console.log(`Forcing reset of bot ${botId} connection`);
      await resetBotConnection(botId);
      return NextResponse.json({ reset: true });
    }
    
    // Get current connection status
    const status = getConnectionStatus(botId);
    
    // If this is a polling request, handle differently
    if (isPoll === 'true') {
      // If there's an error, return it for debugging
      const error = getBotError(botId);
      if (error) {
        return NextResponse.json({ 
          success: false, 
          error
        });
      }
      
      // Check if connected
      if (status.connected) {
        return NextResponse.json({ success: true });
      }
      
      // Still waiting
      return NextResponse.json({ success: false });
    }
    
    // Return QR code if available
    if (status.qr) {
      console.log(`Returning QR code for bot ${botId}`);
      return NextResponse.json({ qr: status.qr });
    }
    
    // Check if connected
    if (status.connected) {
      return NextResponse.json({ active: true });
    }
    
    // Check for errors
    const error = getBotError(botId);
    if (error) {
      console.log(`Error for bot ${botId}:`, error);
      
      // Check if it's a device linking error
      const isDeviceLinkingError = 
        error.type === 'device.link.failure' || 
        (error.message && (
          error.message.includes("couldn't link") || 
          error.message.includes("device linking failed")
        ));
      
      if (isDeviceLinkingError) {
        return NextResponse.json({ 
          error: "Couldn't link device. Please reset and try again.", 
          deviceLinkingError: true,
          errorDetails: error
        });
      }
      
      // For other errors, provide the details
      return NextResponse.json({ 
        error: `Connection error: ${error.message || 'Unknown error'}`, 
        errorDetails: error
      });
    }
    
    // If no connection exists, initialize one
    if (!status.qr && !status.connected) {
      console.log(`Initializing connection for bot ${botId}`);
      const initialized = await initWhatsAppConnection(botId);
      
      if (!initialized) {
        return NextResponse.json({ 
          error: 'Failed to initialize WhatsApp connection. Please try again.' 
        });
      }
      
      // Connection initialized, but QR not ready yet
      console.log(`Connection initialized for bot ${botId}, waiting for QR`);
    }
    
    // Return a waiting response
    console.log(`Waiting for QR code to be generated for bot ${botId}`);
    return NextResponse.json({ waiting: true });
  } catch (error) {
    console.error('Error in QR endpoint:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Endpoint to force connect a bot (for development only)
export async function POST(request, { params }) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }
    
    // Properly handle params by awaiting them
    const botId = params.botId;
    
    // Validate bot ID - accept UUID format or numeric IDs
    if (!botId) {
      return NextResponse.json({ error: 'Missing bot ID' }, { status: 400 });
    }
    
    console.log(`Force connect request for bot ${botId}`);
    
    // Check if the bot exists
    const bots = await executeQuery(
      'SELECT * FROM whatsapp_bots WHERE id = ?',
      [botId]
    );
    
    if (bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    
    // Force activate the bot
    await executeQuery(`
      UPDATE whatsapp_bots
      SET 
        whatsapp_session = ?,
        activated_at = NOW(),
        expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
        status = 'active'
      WHERE id = ?
    `, [JSON.stringify({ forceConnected: true }), botId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in force connect endpoint:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 