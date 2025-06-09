// WhatsApp Connection Module using Baileys
import { default as makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs/promises';
import path from 'path';
import { executeQuery } from '../db/config.js';
import QRCode from 'qrcode';

// Store active connections in memory
const activeConnections = new Map();
const connectionStatus = new Map();
const connectionErrors = new Map();

// Path for auth files
const AUTH_DIR = path.join(process.cwd(), 'tmp', 'auth');

// Initialize a WhatsApp connection for a bot
export async function initWhatsAppConnection(botId) {
  try {
    console.log(`Starting WhatsApp connection for bot ${botId}`);
    
    // Ensure auth directory exists
    const botAuthDir = path.join(AUTH_DIR, botId.toString());
    await fs.mkdir(botAuthDir, { recursive: true });
    
    // If we already have a connection, close it first
    if (activeConnections.has(botId)) {
      const { sock } = activeConnections.get(botId);
      try {
        // Only call end() if the socket is properly established
        if (sock && typeof sock.end === 'function' && sock.ws && sock.ws.readyState === 1) {
          sock.end();
        }
      } catch (error) {
        console.error('Error closing existing connection:', error);
      }
      activeConnections.delete(botId);
      connectionStatus.delete(botId);
    }
    
    // Initialize the auth state
    const { state, saveCreds } = await useMultiFileAuthState(botAuthDir);
    
    // Create socket with basic configuration
    const sock = makeWASocket({
      auth: state,
      browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
      printQRInTerminal: false, // We'll handle QR codes ourselves
      connectTimeoutMs: 30000, // 30 seconds timeout
      keepAliveIntervalMs: 10000, // 10 seconds keep-alive
    });
    
    // Store the socket in the active connections map
    activeConnections.set(botId, { sock, saveCreds });
    
    // Initialize connection status
    connectionStatus.set(botId, { qr: null, connected: false });
    
    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // If we got a QR code, store it
      if (qr) {
        try {
          // Make sure we generate a valid QR data URL - this is critical
          const qrUrl = await QRCode.toDataURL(qr, { 
            errorCorrectionLevel: 'H',
            margin: 1,
            scale: 8
          });
          // Store the QR in the connection status with a timestamp
          connectionStatus.set(botId, { 
            qr: qrUrl, 
            connected: false, 
            qrTimestamp: Date.now() 
          });
          console.log(`QR code generated for bot ${botId}`);
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
        }
      }
      
      // If connected, update status and save to database
      if (connection === 'open') {
        console.log(`Bot ${botId} connected successfully`);
        try {
          // Get the bot details
          const bots = await executeQuery(
            'SELECT subscription_id FROM whatsapp_bots WHERE id = ?',
            [botId]
          );
          
          if (bots.length === 0) {
            console.error(`Bot ${botId} not found`);
            return;
          }
          
          const subscriptionId = bots[0].subscription_id;
          
          // Get subscription duration
          const subscriptions = await executeQuery(`
            SELECT s.id, sp.duration_in_days
            FROM subscriptions s
            INNER JOIN subscription_plans sp ON s.plan_id = sp.id
            WHERE s.id = ?
          `, [subscriptionId]);
          
          if (subscriptions.length === 0) {
            console.error(`Subscription ${subscriptionId} not found`);
            return;
          }
          
          const durationInDays = subscriptions[0].duration_in_days;
          
          // Update the bot in the database
          await executeQuery(`
            UPDATE whatsapp_bots
            SET 
              activated_at = NOW(),
              expires_at = DATE_ADD(NOW(), INTERVAL ? DAY),
              status = 'active'
            WHERE id = ?
          `, [durationInDays, botId]);
          
          // Update connection status
          connectionStatus.set(botId, { qr: null, connected: true });
          connectionErrors.delete(botId);
          
        } catch (error) {
          console.error('Error saving WhatsApp session:', error);
        }
      }
      
      // Handle disconnection
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error instanceof Boom 
          ? lastDisconnect.error.output.statusCode 
          : null;
        
        const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
        
        // Store error information
        connectionErrors.set(botId, { 
          code: statusCode, 
          message: errorMessage, 
          timestamp: new Date().toISOString()
        });
        
        // Check if we should reconnect
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log(`Bot ${botId} disconnected. Reconnecting...`);
          
          // Wait a moment before reconnecting
          setTimeout(() => {
            // Check if we're still in a disconnected state before trying to reconnect
            const status = connectionStatus.get(botId);
            if (!status?.connected) {
            initWhatsAppConnection(botId);
            }
          }, 5000);
        } else {
          console.log(`Bot ${botId} disconnected. Not reconnecting.`);
          // Clean up connection resources
          if (activeConnections.has(botId)) {
            activeConnections.delete(botId);
          }
        }
      }
    });
    
    // Save credentials whenever they are updated
    sock.ev.on('creds.update', async () => {
      try {
        // Save to file system first
        await saveCreds();
        
        // Then try to save to database
        await saveSessionToDatabase(botId);
        
        console.log(`Updated credentials saved for bot ${botId}`);
      } catch (error) {
        console.error(`Error saving credentials for bot ${botId}:`, error);
      }
    });
    
    // Handle call events
    sock.ev.on('call', async ([call]) => {
      if (call && call.isGroup === false) {
        const callerId = call.from;
        const callId = call.id;
        const isVideo = call.isVideo;
        
        console.log(`Received ${isVideo ? 'video' : 'voice'} call from ${callerId} with ID ${callId}`);
        
        try {
          // Log the call event
          await executeQuery(`
            INSERT INTO whatsapp_calls (
              bot_id,
              caller_jid,
              call_id,
              call_status
            ) VALUES (?, ?, ?, 'received')
          `, [botId, callerId, callId]);
          
          // Check if call blocking is enabled for this bot
          const settings = await executeQuery(`
            SELECT * FROM call_blocking_settings WHERE bot_id = ?
          `, [botId]);
          
          if (settings.length > 0 && settings[0].is_enabled) {
            // Get call blocking settings
            const callSettings = settings[0];
            const dailyCallLimit = callSettings.daily_call_limit;
            const blockType = callSettings.block_type;
            const autoReplyMessage = callSettings.auto_reply_message;
            
            // Check if the caller is already blocked
            const blockedContact = await executeQuery(`
              SELECT * FROM whatsapp_blocked_contacts 
              WHERE bot_id = ? AND contact_jid = ? AND is_active = TRUE
            `, [botId, callerId]);
            
            if (blockedContact.length > 0) {
              // Contact is blocked, reject the call
              await rejectCall(botId, callId, callerId);
          
              // Send auto-reply message
              await sendMessage(botId, callerId, autoReplyMessage);
              
              // Update call status
              await executeQuery(`
                UPDATE whatsapp_calls 
                SET call_status = 'blocked' 
                WHERE bot_id = ? AND call_id = ?
              `, [botId, callId]);
              
            } else {
              // Check how many calls this user has made today
              const todayCalls = await executeQuery(`
                SELECT COUNT(*) as call_count 
                FROM whatsapp_calls 
                WHERE bot_id = ? 
                AND caller_jid = ? 
                AND call_timestamp >= CURDATE()
              `, [botId, callerId]);
              
              const callCount = todayCalls[0].call_count;
              
              if (callCount > dailyCallLimit) {
                // Caller has exceeded daily limit, block them
                const expiresAt = blockType === 'temporary' 
                  ? 'DATE_ADD(NOW(), INTERVAL 1 DAY)' 
                  : 'NULL';
                
                await executeQuery(`
                  INSERT INTO whatsapp_blocked_contacts (
                    bot_id,
                    contact_jid,
                    reason,
                    expires_at,
                    is_active
                  ) VALUES (?, ?, ?, ${expiresAt}, TRUE)
                  ON DUPLICATE KEY UPDATE 
                    reason = VALUES(reason),
                    expires_at = VALUES(expires_at),
                    is_active = TRUE
                `, [botId, callerId, `Exceeded daily call limit of ${dailyCallLimit} calls`]);
                
                // Reject the call
                await rejectCall(botId, callId, callerId);
                
                // Send auto-reply message
                await sendMessage(botId, callerId, autoReplyMessage);
                
                // Update call status
                await executeQuery(`
                  UPDATE whatsapp_calls 
                  SET call_status = 'blocked' 
                  WHERE bot_id = ? AND call_id = ?
                `, [botId, callId]);
              } else {
                // Just reject the call without blocking
                await rejectCall(botId, callId, callerId);
                
                // Update call status
                await executeQuery(`
                  UPDATE whatsapp_calls 
                  SET call_status = 'rejected' 
                  WHERE bot_id = ? AND call_id = ?
                `, [botId, callId]);
              }
            }
          } else {
            // Call blocking not enabled, just reject the call
            await rejectCall(botId, callId, callerId);
            
            // Update call status
            await executeQuery(`
              UPDATE whatsapp_calls 
              SET call_status = 'rejected' 
              WHERE bot_id = ? AND call_id = ?
            `, [botId, callId]);
          }
        } catch (error) {
          console.error(`Error handling call from ${callerId}:`, error);
        }
      }
    });
    
    // Handle messages
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            const sender = msg.key.remoteJid;
            const messageType = Object.keys(msg.message)[0];
            let messageText = '';
    
            // Extract message content based on type
            if (messageType === 'conversation') {
              messageText = msg.message.conversation;
            } else if (messageType === 'extendedTextMessage') {
              messageText = msg.message.extendedTextMessage.text;
            }
            
            // Log received message
            console.log(`New message from ${sender}: ${messageText}`);
            
            // Check for automated responses from database
            if (messageText) {
              try {
                // Determine if this is a group chat or private chat
                const isGroupChat = sender.endsWith('@g.us');
                const chatType = isGroupChat ? 'group' : 'private';
                
                // Check if sender is blocked
                const isBlocked = await executeQuery(`
                  SELECT 1 FROM whatsapp_blocked_contacts
                  WHERE bot_id = ? AND contact_jid = ? AND is_active = TRUE
                `, [botId, sender]);
                
                if (isBlocked.length > 0) {
                  // Get auto-reply message from settings
                  const settings = await executeQuery(`
                    SELECT auto_reply_message FROM call_blocking_settings WHERE bot_id = ?
                  `, [botId]);
                  
                  const blockMessage = settings.length > 0 
                    ? settings[0].auto_reply_message 
                    : "Sorry, you have been blocked from contacting this number.";
                  
                  // Send the block message
                  await sock.sendMessage(sender, { text: blockMessage });
                  
                  // Don't process further
                  continue;
      }
      
                // Get matching response from database with chat type filter
                const responses = await executeQuery(`
                  SELECT * FROM bot_responses
                  WHERE bot_id = ? 
                  AND trigger_text = ? 
                  AND is_active = TRUE
                  AND (chat_type = 'all' OR chat_type = ?)
                  LIMIT 1
                `, [botId, messageText, chatType]);
                
                if (responses.length > 0) {
                  const response = responses[0];
                  
                  // Send the automated response
                  await sock.sendMessage(
                    sender, 
                    { text: response.response_text }
                  );
                  
                  console.log(`Automated reply sent to ${sender}`);
                  
                  // Log the outgoing message
                  await executeQuery(`
                    INSERT INTO whatsapp_messages (
                      id,
                      bot_id,
                      sender,
                      recipient,
                      message_text,
                      direction
                    ) VALUES (UUID(), ?, ?, ?, ?, 'outbound')
                  `, [
                    botId,
                    'bot',
                    sender,
                    response.response_text
                  ]);
                } else {
                  // No matching response found, use default response
                  await sock.sendMessage(
                    sender, 
                    { text: `I received your message: "${messageText}". However, I don't have a specific response for this.` }
                  );
                  console.log(`Default reply sent to ${sender}`);
                }
                
                // Log the incoming message
                await executeQuery(`
                  INSERT INTO whatsapp_messages (
                    id,
                    bot_id,
                    sender,
                    recipient,
                    message_text,
                    direction
                  ) VALUES (UUID(), ?, ?, ?, ?, 'inbound')
                `, [
                  botId,
                  sender,
                  'bot',
                  messageText
                ]);
                
        } catch (error) {
                console.error(`Error processing message from ${sender}:`, error);
                
                // Send a fallback response
                try {
                  await sock.sendMessage(
                    sender, 
                    { text: "Sorry, I encountered an error processing your message." }
                  );
                } catch (sendError) {
                  console.error(`Error sending fallback response to ${sender}:`, sendError);
                }
              }
            }
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing WhatsApp connection:', error);
    connectionErrors.set(botId, { 
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

// Reset a bot's connection and clear auth data
export async function resetBotConnection(botId) {
  try {
    console.log(`Resetting connection for bot ${botId}`);
    
    // Close any active connection
    if (activeConnections.has(botId)) {
      const { sock } = activeConnections.get(botId);
      try {
        if (sock && typeof sock.end === 'function' && sock.ws && sock.ws.readyState === 1) {
          sock.end();
        }
      } catch (error) {
        console.error('Error closing existing connection:', error);
      }
      activeConnections.delete(botId);
    }
    
    // Clear connection status
    connectionStatus.delete(botId);
    connectionErrors.delete(botId);
    
    // Delete auth files
    const botAuthDir = path.join(AUTH_DIR, botId.toString());
    try {
      await fs.rm(botAuthDir, { recursive: true, force: true });
      console.log(`Auth directory deleted for bot ${botId}`);
    } catch (deleteError) {
      console.error(`Error deleting auth directory for bot ${botId}:`, deleteError);
      // Continue even if deletion fails
    }
    
    // Clear session data from database
    await executeQuery(`
      UPDATE whatsapp_bots
      SET whatsapp_session = NULL
      WHERE id = ?
    `, [botId]);
    
    // Reinitialize connection
    return await initWhatsAppConnection(botId);
  } catch (error) {
    console.error(`Error resetting connection for bot ${botId}:`, error);
    return false;
  }
}

// Reject a WhatsApp call
export async function rejectCall(botId, callId, callerId) {
  try {
    if (!activeConnections.has(botId)) {
      throw new Error('Bot not connected');
    }
    
    const { sock } = activeConnections.get(botId);
    
    // Reject the call
    await sock.rejectCall(callId, callerId);
    console.log(`Call from ${callerId} rejected`);
    return true;
  } catch (error) {
    console.error(`Error rejecting call for bot ${botId}:`, error);
    return false;
  }
}

// Get connection status by bot ID
export async function getConnectionStatus(botId) {
  try {
    // Get the current status from the map
    const status = connectionStatus.get(botId) || { qr: null, connected: false };
    
    // If we don't have a status yet, check if we have a connection in the connections map
    if (!status.connected && !status.qr) {
      const hasActiveConnection = activeConnections.has(botId);
      
      // If we have an active connection but no status, update it
      if (hasActiveConnection) {
        // Get the socket
        const { sock } = activeConnections.get(botId);
        
        // Try to determine connection state from the socket
        const isConnected = sock && sock.user && sock.user.id;
        
        if (isConnected) {
          connectionStatus.set(botId, { qr: null, connected: true });
          return { qr: null, connected: true };
        }
      }
    }
    
    return status;
  } catch (error) {
    console.error(`Error getting connection status for bot ${botId}:`, error);
    return { qr: null, connected: false, error: error.message };
  }
}

// Save WhatsApp session data to database
async function saveSessionToDatabase(botId) {
  try {
    // Get session state
    const botAuthDir = path.join(AUTH_DIR, botId.toString());
    const { state } = await useMultiFileAuthState(botAuthDir);
    
    // Serialize auth state to store in database
    const sessionData = JSON.stringify(state);
    
    // Update database
    await executeQuery(`
      UPDATE whatsapp_bots
      SET whatsapp_session = ?
      WHERE id = ?
    `, [sessionData, botId]);
    
    return true;
  } catch (error) {
    console.error('Error saving session to database:', error);
    return false;
  }
}

// Close a bot connection
export async function closeBotConnection(botId) {
  if (activeConnections.has(botId)) {
    const { sock } = activeConnections.get(botId);
    try {
      // Only call end() if the socket is properly established
      if (sock && typeof sock.end === 'function' && sock.ws && sock.ws.readyState === 1) {
        sock.end();
      }
      activeConnections.delete(botId);
      connectionStatus.delete(botId);
      return true;
    } catch (error) {
      console.error(`Error closing connection for bot ${botId}:`, error);
      return false;
    }
  }
  
  return false;
}

// Get list of connected bots
export function getConnectedBots() {
  const connected = [];
  
  for (const [botId, status] of connectionStatus.entries()) {
    if (status.connected) {
      connected.push(botId);
    }
  }
  
  return connected;
}

// Send a message from a bot
export async function sendMessage(botId, recipient, message) {
  try {
    if (!activeConnections.has(botId)) {
      throw new Error('Bot not connected');
    }
    
    const { sock } = activeConnections.get(botId);
  
    // Format the recipient number if needed
    let formattedRecipient = recipient;
    if (!recipient.includes('@')) {
      // Add WhatsApp suffix if not present
      formattedRecipient = `${recipient.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    }
    
    // Send the message
    await sock.sendMessage(formattedRecipient, { text: message });
    return true;
  } catch (error) {
    console.error(`Error sending message from bot ${botId}:`, error);
    return false;
  }
}

// Clean up expired blocks
export async function cleanupExpiredBlocks() {
  try {
    // Update is_active to FALSE for all entries where expires_at is in the past
    await executeQuery(`
      UPDATE whatsapp_blocked_contacts
      SET is_active = FALSE
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `);
    
    return true;
  } catch (error) {
    console.error('Error cleaning up expired blocks:', error);
    return false;
  }
}

// Get bot error
export function getBotError(botId) {
  return connectionErrors.get(botId) || null;
}

// Verify if a session is active by checking with the WhatsApp servers
export async function verifyActiveSession(botId) {
  try {
    // Check if we have an active connection
    if (activeConnections.has(botId) && connectionStatus.get(botId)?.connected) {
      return true;
    }
    
    // If not, try to initialize a new connection
    await initWhatsAppConnection(botId);
    
    // Wait a moment for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the connection is now active
    return connectionStatus.get(botId)?.connected || false;
  } catch (error) {
    console.error(`Error verifying session for bot ${botId}:`, error);
    return false;
  }
}

export default {
  initWhatsAppConnection,
  getConnectionStatus,
  getConnectedBots,
  sendMessage,
  closeBotConnection,
  cleanupExpiredBlocks,
  getBotError,
  verifyActiveSession,
  resetBotConnection
}; 