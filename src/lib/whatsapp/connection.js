import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { executeQuery } from '../db/config.js';
import QRCode from 'qrcode';
import { delay } from '../utils/helpers.js';

// Polyfills for Node.js < 18
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}
if (typeof globalThis.crypto !== 'object') {
  globalThis.crypto = require('crypto');
}
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = require('buffer').Buffer;
}

// Store active connections in memory
const activeConnections = new Map();
const connectionStatus = new Map();
const connectionRetries = new Map();
const connectionErrors = new Map();

// Path for auth files
const AUTH_DIR = path.join(process.cwd(), 'tmp', 'auth');

// Max retry attempts
const MAX_RETRY_ATTEMPTS = 5;

// Use different browser profiles to try
const BROWSER_PROFILES = [
  ['Chrome', 'Desktop', '116.0.0.0'],
  ['Chrome', 'Desktop', '119.0.0.0'],
  ['Firefox', 'Desktop', '99.0.0'],
  ['Edge', 'Desktop', '119.0.0.0'],
  ['Safari', 'Desktop', '16.0.0']
];

// Create a compatible logger
const createLogger = (prefix) => {
  return {
    info: (...args) => console.log(`[${prefix}] INFO:`, ...args),
    debug: (...args) => console.log(`[${prefix}] DEBUG:`, ...args),
    warn: (...args) => console.warn(`[${prefix}] WARN:`, ...args),
    error: (...args) => console.error(`[${prefix}] ERROR:`, ...args),
    trace: (...args) => console.log(`[${prefix}] TRACE:`, ...args),
    child: (opts) => createLogger(`${prefix}:${opts.prefix || ''}`),
  };
};

// Ensure the auth directory exists
async function ensureAuthDir() {
  try {
    await fs.mkdir(AUTH_DIR, { recursive: true });
    console.log(`Auth directory ensured at: ${AUTH_DIR}`);
    return true;
  } catch (error) {
    console.error('Error creating auth directory:', error);
    return false;
  }
}

// Get a browser profile based on retry count
function getBrowserProfile(retryCount = 0) {
  const index = retryCount % BROWSER_PROFILES.length;
  return BROWSER_PROFILES[index];
}

// Initialize a WhatsApp connection for a bot
export async function initWhatsAppConnection(botId) {
  try {
    console.log(`Starting WhatsApp connection initialization for bot ${botId}`);
    
    // Ensure auth directory exists
    await ensureAuthDir();
    
    // If we already have a connection, close it first
    if (activeConnections.has(botId)) {
      console.log(`Closing existing connection for bot ${botId}`);
      try {
        const { sock, sessionDir } = activeConnections.get(botId);
        if (sock && typeof sock.end === 'function') {
          sock.end();
        }
        activeConnections.delete(botId);
        connectionStatus.delete(botId);
        
        // Clean up session directory
        try {
          await fs.rm(sessionDir, { recursive: true, force: true });
          console.log(`Removed session directory for bot ${botId}`);
        } catch (cleanupError) {
          console.error('Error cleaning up session directory:', cleanupError);
        }
      } catch (error) {
        console.error('Error closing existing connection:', error);
      }
    }
    
    // Create a unique session folder for this connection
    const sessionId = randomUUID();
    const sessionDir = path.join(AUTH_DIR, sessionId);
    
    // Ensure the session directory exists
    await fs.mkdir(sessionDir, { recursive: true });
    console.log(`Created session directory: ${sessionDir}`);
    
    // Initialize the auth state
    console.log(`Initializing auth state for bot ${botId}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    // Make the auth state cacheable for better performance
    const logger = createLogger(`wa-${botId}`);
    const keys = makeCacheableSignalKeyStore(state.keys, logger);
    
    // Fetch the latest version of WhatsApp Web
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);
    
    // Get browser profile based on retry count
    const retryCount = connectionRetries.get(botId) || 0;
    const browserProfile = getBrowserProfile(retryCount);
    console.log(`Using browser profile: ${browserProfile.join(' ')} (retry: ${retryCount})`);
    
    // Initialize the WhatsApp socket with optimized config
    console.log(`Creating WhatsApp socket for bot ${botId}`);
    
    // Create socket with optimized configuration
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        // Use cacheable key store
        keys: keys
      },
      printQRInTerminal: false, // We'll handle QR codes ourselves
      browser: browserProfile,
      version: version,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 15000, // Reduced to avoid timeout issues
      emitOwnEvents: true,
      syncFullHistory: false,
      linkPreviewImageThumbnailWidth: 192,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 500,
      transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 600 },
      logger: logger
    });
    
    console.log(`Socket created for bot ${botId}`);
    
    // Store the socket in the active connections map
    activeConnections.set(botId, { sock, sessionDir, saveCreds });
    connectionStatus.set(botId, { qr: null, connected: false });
    connectionRetries.set(botId, retryCount);
    connectionErrors.delete(botId);
    console.log(`Connection initialized for bot ${botId}`);
    
    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log(`Connection update for bot ${botId}:`, { 
        connection, 
        qr: qr ? `QR received (${qr.length} chars)` : 'No QR',
        lastDisconnect: lastDisconnect ? 
          `${lastDisconnect.error?.output?.payload?.error || 'unknown'} (${lastDisconnect.error?.output?.statusCode || 'no code'})` : 
          'No disconnect info'
      });
      
      // If QR code is available, store it
      if (qr) {
        console.log(`QR code generated for bot ${botId} (length: ${qr.length})`);
        try {
          // Convert the QR string directly to a data URL using qrcode library with higher quality settings
          const qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'H', // Higher error correction for better scanning
            margin: 4,
            width: 400,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          
          console.log(`QR code converted to data URL for bot ${botId} (length: ${qrDataUrl.length})`);
          connectionStatus.set(botId, { qr: qrDataUrl, connected: false });
        } catch (error) {
          console.error(`Error converting QR code for bot ${botId}:`, error);
          
          // If conversion fails, try to use the raw QR data
          connectionStatus.set(botId, { qr, connected: false });
        }
      }
      
      // If connected, save the session
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
          
          // Read the auth files
          const credentialsPath = path.join(sessionDir, 'creds.json');
          const credsBuffer = await fs.readFile(credentialsPath);
          const creds = JSON.parse(credsBuffer.toString());
          
          // Serialize the auth state
          const authJSON = {
            creds,
            // Include any other necessary auth data
          };
          
          // Update the bot in the database
          await executeQuery(`
            UPDATE whatsapp_bots
            SET 
              whatsapp_session = ?,
              activated_at = NOW(),
              expires_at = DATE_ADD(NOW(), INTERVAL ? DAY),
              status = 'active'
            WHERE id = ?
          `, [JSON.stringify(authJSON), durationInDays, botId]);
          
          console.log(`Bot ${botId} saved to database as active`);
          
          // Update connection status
          connectionStatus.set(botId, { qr: null, connected: true });
          connectionRetries.delete(botId);
          connectionErrors.delete(botId);
          
          // Clean up session directory
          try {
            await fs.rm(sessionDir, { recursive: true, force: true });
          } catch (cleanupError) {
            console.error('Error cleaning up session directory:', cleanupError);
          }
          
          // Close the socket after saving
          setTimeout(() => {
            if (activeConnections.has(botId)) {
              const { sock } = activeConnections.get(botId);
              if (sock && typeof sock.end === 'function') {
                sock.end();
              }
              activeConnections.delete(botId);
            }
          }, 5000);
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
        const errorOutput = lastDisconnect?.error?.output?.payload?.error || 'Unknown error type';
        const errorCode = lastDisconnect?.error?.output?.payload?.data?.code || 0;
        
        console.log(`Bot ${botId} connection closed with status code: ${statusCode}, error: ${errorMessage}, type: ${errorOutput}, code: ${errorCode}`);
        
        // Store error information for debugging
        connectionErrors.set(botId, { 
          code: errorCode || statusCode, 
          message: errorMessage, 
          type: errorOutput,
          timestamp: new Date().toISOString()
        });
        
        // Check specific error conditions
        const isDeviceLinkingError = errorOutput === 'device.link.failure' || 
                                    errorMessage.includes("couldn't link") || 
                                    errorMessage.includes("device linking failed");
        
        const isStreamError = errorMessage.includes("Stream Errored") || errorCode === 515;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isBadSession = statusCode === DisconnectReason.badSession;
        const isConnectionLost = statusCode === DisconnectReason.connectionLost;
        const isConnectionClosed = statusCode === DisconnectReason.connectionClosed;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || 
                                  errorMessage.includes("restart required");
        
        // Determine if we should try a different approach
        const shouldTryDifferentApproach = isDeviceLinkingError || isBadSession || isStreamError || isRestartRequired;
        // Determine if we should simply retry
        const shouldRetry = isConnectionLost || isConnectionClosed;
        // Determine if we should give up
        const shouldGiveUp = isLoggedOut;
        
        const retryCount = connectionRetries.get(botId) || 0;
        
        if (shouldGiveUp) {
          console.log(`Bot ${botId} cannot reconnect: permanent error`);
          // Clean up connection resources
          if (activeConnections.has(botId)) {
            const { sessionDir } = activeConnections.get(botId);
            try {
              await fs.rm(sessionDir, { recursive: true, force: true });
            } catch (cleanupError) {
              console.error('Error cleaning up session directory:', cleanupError);
            }
            activeConnections.delete(botId);
            connectionRetries.delete(botId);
          }
        } else if (shouldTryDifferentApproach && retryCount < MAX_RETRY_ATTEMPTS) {
          // Try a completely different approach (new session, different browser profile)
          connectionRetries.set(botId, retryCount + 1);
          console.log(`Bot ${botId} reconnecting with different approach, attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);
          
          // Wait a bit longer before retry
          const delay = Math.min(3000 * Math.pow(2, retryCount), 15000);
          setTimeout(() => {
            // Clean up old connection first
            if (activeConnections.has(botId)) {
              const { sessionDir } = activeConnections.get(botId);
              try {
                fs.rm(sessionDir, { recursive: true, force: true });
              } catch (error) {
                console.error('Error removing session directory:', error);
              }
              activeConnections.delete(botId);
            }
            
            // Start fresh connection with new session
            initWhatsAppConnection(botId);
          }, delay);
        } else if (shouldRetry && retryCount < MAX_RETRY_ATTEMPTS) {
          // Simple retry for connection issues
          connectionRetries.set(botId, retryCount + 1);
          console.log(`Bot ${botId} reconnecting, attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);
          
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            if (activeConnections.has(botId)) {
              const { sessionDir } = activeConnections.get(botId);
              try { fs.rm(sessionDir, { recursive: true, force: true }); } catch (e) { console.error('Error removing session dir:', e); }
              activeConnections.delete(botId);
              connectionStatus.delete(botId);
              connectionRetries.delete(botId);
            }
            setTimeout(() => initWhatsAppConnection(botId), delay);
          }, 0);
        } else {
          // We've tried everything or hit max retries
          console.log(`Bot ${botId} giving up after ${retryCount} attempts`);
          // Clean up if disconnected
          if (activeConnections.has(botId)) {
            const { sessionDir } = activeConnections.get(botId);
            try {
              await fs.rm(sessionDir, { recursive: true, force: true });
            } catch (cleanupError) {
              console.error('Error cleaning up session directory:', cleanupError);
            }
            activeConnections.delete(botId);
            connectionRetries.delete(botId);
          }
        }
      }
    });
    
    // Add error handler
    sock.ev.on('connection.error', (error) => {
      console.error(`Connection error for bot ${botId}:`, error);
      connectionErrors.set(botId, { 
        message: error.message || 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // For stream errors, try to reconnect
      if (error.message && error.message.includes("Stream Errored")) {
        const retryCount = connectionRetries.get(botId) || 0;
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          console.log(`Stream error detected for bot ${botId}, will reconnect`);
          
          // Increment retry count
          connectionRetries.set(botId, retryCount + 1);
          
          // Close the current connection
          if (sock && typeof sock.end === 'function') {
            sock.end();
          }
          
          // Try to reconnect after a delay
          setTimeout(() => {
            if (activeConnections.has(botId)) {
              const { sessionDir } = activeConnections.get(botId);
              try { fs.rm(sessionDir, { recursive: true, force: true }); } catch (e) { console.error('Error removing session dir:', e); }
              activeConnections.delete(botId);
              connectionStatus.delete(botId);
              connectionRetries.delete(botId);
            }
            setTimeout(() => initWhatsAppConnection(botId), 5000);
          }, 0);
        }
      }
    });
    
    // Save credentials on update
    sock.ev.on('creds.update', async () => {
      console.log(`Credentials updated for bot ${botId}`);
      await saveCreds();
    });
    
    // Add a failsafe to check for QR code periodically
    const qrCheckInterval = setInterval(async () => {
      const status = getConnectionStatus(botId);
      
      // If we already have a QR code or we're connected, no need to check
      if (status.qr || status.connected) {
        clearInterval(qrCheckInterval);
        return;
      }
      
      // Check if there's an active connection
      if (!activeConnections.has(botId)) {
        clearInterval(qrCheckInterval);
        return;
      }
      
      // Get the socket from active connections
      const { sock } = activeConnections.get(botId);
      
      // If socket has QR but it wasn't processed, handle it now
      if (sock.qr) {
        console.log(`Failsafe: QR code found for bot ${botId} (length: ${sock.qr.length})`);
        try {
          const qrDataUrl = await QRCode.toDataURL(sock.qr, {
            errorCorrectionLevel: 'H',
            margin: 4,
            width: 400,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          
          console.log(`Failsafe: QR code converted for bot ${botId}`);
          connectionStatus.set(botId, { qr: qrDataUrl, connected: false });
        } catch (error) {
          console.error(`Failsafe: Error converting QR code for bot ${botId}:`, error);
          connectionStatus.set(botId, { qr: sock.qr, connected: false });
        }
      }
    }, 3000);
    
    // Clean up QR check interval after 2 minutes (should be connected by then)
    setTimeout(() => {
      clearInterval(qrCheckInterval);
    }, 2 * 60 * 1000);
    
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

// Get connection status
export function getConnectionStatus(botId) {
  return connectionStatus.get(botId) || { qr: null, connected: false };
}

// Check if a bot is connected
export function isBotConnected(botId) {
  const status = connectionStatus.get(botId);
  return status?.connected || false;
}

// Get QR code for a bot
export function getBotQrCode(botId) {
  const status = connectionStatus.get(botId);
  return status?.qr || null;
}

// Get the latest error for a bot
export function getBotError(botId) {
  return connectionErrors.get(botId) || null;
}

// Close a bot connection
export async function closeBotConnection(botId) {
  if (activeConnections.has(botId)) {
    const { sock, sessionDir } = activeConnections.get(botId);
    try {
      if (sock && typeof sock.end === 'function') {
        sock.end();
      }
      activeConnections.delete(botId);
      connectionStatus.delete(botId);
      connectionRetries.delete(botId);
      
      // Clean up session directory
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error cleaning up session directory:', cleanupError);
      }
      
      return true;
    } catch (error) {
      console.error(`Error closing connection for bot ${botId}:`, error);
      return false;
    }
  }
  
  return false;
}

// Reset a bot connection (force fresh start)
export async function resetBotConnection(botId) {
  await closeBotConnection(botId);
  connectionRetries.delete(botId);
  connectionErrors.delete(botId);
  connectionStatus.delete(botId);
  
  // Wait a moment before reinitializing
  await delay(1000);
  
  return initWhatsAppConnection(botId);
}

// Get all active connections
export function getActiveConnections() {
  return [...activeConnections.keys()];
}

export default {
  initWhatsAppConnection,
  getConnectionStatus,
  isBotConnected,
  getBotQrCode,
  getBotError,
  closeBotConnection,
  resetBotConnection,
  getActiveConnections
}; 