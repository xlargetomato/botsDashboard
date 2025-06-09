import { NextResponse } from 'next/server';
import { initWhatsAppConnection, getConnectionStatus, getBotError, resetBotConnection } from '@/lib/whatsapp/connection.js';
import { executeQuery } from '@/lib/db/config.js';

// Allow server to take some time to generate QR
export const maxDuration = 120;

// Endpoint to get QR code for a bot
export async function GET(request, context) {
  try {
    // Get bot ID from params - properly awaiting the params object
    const { params } = context;
    const botId = params.botId;
    
    const searchParams = request.nextUrl.searchParams;
    const forcereset = searchParams.get('forcereset');
    const isPoll = searchParams.get('poll');
    
    // Validate bot ID
    if (!botId) {
      return NextResponse.json({ error: 'Missing bot ID' }, { status: 400 });
    }
    
    console.log(`QR request for bot ${botId}${forcereset ? ' (force reset)' : ''}${isPoll ? ' (polling)' : ''}`);
    
    // Check if the bot exists
    const bots = await executeQuery(
      'SELECT * FROM whatsapp_bots WHERE id = ?',
      [botId]
    );
    
    if (bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    
    const bot = bots[0];
    
    // If a force reset is requested, reset the connection
    if (forcereset === 'true') {
      console.log(`Forcing reset of bot ${botId} connection`);
      await resetBotConnection(botId);
      return NextResponse.json({ reset: true });
    }
    
    // Check if the bot has a valid session that should be prioritized
    const hasSession = bot.whatsapp_session !== null;
    
    // Get current connection status
    const status = await getConnectionStatus(botId);
    
    // Only suppress QR if session exists AND connection is verified as active
    if (hasSession && status.connected && !forcereset) {
      // Verify if we can connect with existing session
      const sessionQuery = await executeQuery(
        'SELECT updated_at FROM whatsapp_bots WHERE id = ? AND whatsapp_session IS NOT NULL',
        [botId]
      );
      if (sessionQuery.length > 0) {
        console.log(`Bot ${botId} has a stored session and is connected, no need for QR code`);
        return NextResponse.json({ 
          active: true,
          message: 'Bot has an existing session and is connected, no QR needed. Use force reset to start a new session.'
        });
      }
    }
    
    // If this is a polling request, check if connected
    if (isPoll === 'true') {
      // Check if connected
      if (status.connected) {
        return NextResponse.json({ success: true });
      }
      
      // Check for errors
      const error = getBotError(botId);
      if (error) {
        return NextResponse.json({ 
          success: false, 
          error
        });
      }
      
      // Still waiting
      return NextResponse.json({ success: false });
    }
    
    // Check if bot is already active
    if (bot.status === 'active' && status.connected) {
      return NextResponse.json({ active: true });
    }
    
    // Return QR code if available
    if (status.qr) {
      console.log(`Returning QR code for bot ${botId}`);
      return NextResponse.json({ 
        qr: status.qr, 
        timestamp: status.qrTimestamp || Date.now(),
        success: true
      });
    }
    
    // Check for errors
    const error = getBotError(botId);
    if (error) {
      console.log(`Error for bot ${botId}:`, error);
      return NextResponse.json({ 
        error: `Connection error: ${error.message || 'Unknown error'}`, 
        errorDetails: error
      });
    }
    
    // If no connection exists, initialize one
    if (!status.qr && !status.connected) {
      // Check if we've already tried to initialize within the last 10 seconds
      const lastInitTime = request.nextUrl.searchParams.get('lastInit');
      const now = Date.now();
      
      if (!lastInitTime || now - parseInt(lastInitTime) > 5000) {
        console.log(`Initializing connection for bot ${botId}`);
        const initialized = await initWhatsAppConnection(botId);
        
        if (!initialized) {
          return NextResponse.json({ 
            error: 'Failed to initialize WhatsApp connection. Please try again.' 
          });
        }
        
        // Connection initialized, but QR not ready yet
        console.log(`Connection initialized for bot ${botId}, waiting for QR`);
          
        // Return with timestamp to prevent rapid reinitializations
        return NextResponse.json({ 
          waiting: true, 
          lastInit: now 
        });
      } else {
        // Too soon to retry initialization
        return NextResponse.json({ 
          waiting: true,
          message: 'Waiting for QR code generation...'
        });
      }
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