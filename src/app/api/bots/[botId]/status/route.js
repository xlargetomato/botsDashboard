import { NextResponse } from 'next/server';
import { getConnectionStatus, getBotError, verifyActiveSession } from '@/lib/whatsapp/connection.js';
import { executeQuery } from '@/lib/db/config.js';

export async function GET(request, context) {
  try {
    // Get bot ID from params - properly awaiting the params object
    const { params } = context;
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
    
    // Check if we should force a verification (from query param)
    const url = new URL(request.url);
    const forceVerify = url.searchParams.get('verify') === 'true';
    
    // Get connection status
    let status = await getConnectionStatus(botId);
    let isConnectionVerified = false;
    
    // If not connected or force verify is requested, verify the session
    if (forceVerify || !status.connected) {
      console.log(`Verifying WhatsApp session for bot ${botId}`);
      const isActive = await verifyActiveSession(botId);
      
      if (isActive) {
        // Session is actually active, update our status
        status = await getConnectionStatus(botId);
        isConnectionVerified = true;
        
        // Also update the database if needed - only use status column which definitely exists
        if (bot.status !== 'active') {
          await executeQuery(`
            UPDATE whatsapp_bots
            SET status = 'active'
            WHERE id = ?
          `, [botId]);
        }
      }
    }
    
    // Get any errors
    const error = getBotError(botId);
    
    // Get session information
    let sessionInfo = {
      exists: false,
      lastUpdated: null
    };
    
    // Check if session files exist
    try {
      const sessionQuery = await executeQuery(
        'SELECT updated_at FROM whatsapp_bots WHERE id = ? AND whatsapp_session IS NOT NULL',
        [botId]
      );
      
      if (sessionQuery.length > 0) {
        sessionInfo = {
          exists: true,
          lastUpdated: sessionQuery[0].updated_at
        };
        
        // If session exists but we're not connected, force status to connected
        // This fixes the issue where the phone shows connected but the system doesn't
        if (!status.connected && !isConnectionVerified && !forceVerify) {
          console.log(`Session exists for bot ${botId} but not connected. Forcing verification.`);
          const isActive = await verifyActiveSession(botId);
          
          if (isActive) {
            // Update our status
            status = await getConnectionStatus(botId);
            isConnectionVerified = true;
            
            // Update database if needed - only use status column which definitely exists
            if (bot.status !== 'active') {
              await executeQuery(`
                UPDATE whatsapp_bots
                SET status = 'active'
                WHERE id = ?
              `, [botId]);
            }
          }
        }
      }
    } catch (sessionError) {
      console.error('Error checking session:', sessionError);
    }
    
    // Return enhanced status information with prioritized connection state
    const connectionState = {
      connected: status.connected || isConnectionVerified,
      hasQr: status.qr !== null,
      lastActivity: status.lastActivity || null,
      authenticated: (sessionInfo.exists && (status.connected || isConnectionVerified)),
      // Don't suggest reconnect if we have a session and it's verified as connected
      needsReconnect: !status.connected && !isConnectionVerified && sessionInfo.exists,
      // Only suggest QR scan if we don't have a session at all or have a QR and not verified
      needsQrScan: !status.connected && !isConnectionVerified && 
                  (!sessionInfo.exists || status.qr !== null)
    };
    
    // Always prioritize verified connection status
    const finalConnectedStatus = status.connected || isConnectionVerified || 
                                (sessionInfo.exists && connectionState.authenticated);
    
    return NextResponse.json({
      id: bot.id,
      name: bot.name,
      status: bot.status,
      expires_at: bot.expires_at,
      whatsapp_connected: finalConnectedStatus,
      hasQr: !finalConnectedStatus && status.qr !== null,
      qrCode: !finalConnectedStatus ? status.qr : null, // Only include QR if disconnected
      session: sessionInfo,
      connection_state: {
        ...connectionState,
        connected: finalConnectedStatus
      },
      error: error ? {
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        details: error.details || null
      } : null
    });
  } catch (error) {
    console.error('Error in bot status endpoint:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 