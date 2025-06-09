import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Secret key for JWT - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-this';
// API key for microservice auth - should be in environment variables
const MICROSERVICE_API_KEY = process.env.MICROSERVICE_API_KEY || 'your-api-key-change-this';

// Function to encrypt sensitive data
function encryptData(data, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Function to decrypt sensitive data
function decryptData(data, encryptionKey) {
  const parts = data.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Generate a JWT token for the session
function generateSessionToken(botId, session, expiresIn = '1h') {
  const payload = {
    botId,
    session,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Verify a JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

// Helper function to generate an encryption key for a bot
function getBotEncryptionKey(botId) {
  // In production, you would use a more sophisticated key derivation method
  // This is a simplified example
  return crypto.createHash('sha256').update(botId + JWT_SECRET).digest('hex');
}

export async function GET(request, { params }) {
  try {
    // Extract the bot ID from path params
    const botId = params.botId;
    
    // Validate bot ID
    if (!botId) {
      return NextResponse.json({ error: 'Missing bot ID' }, { status: 400 });
    }
    
    // Get authorization header
    const headers = new Headers(request.headers);
    const authHeader = headers.get('authorization');
    const apiKey = headers.get('x-api-key');
    
    // Verify API key or token
    let isAuthorized = false;
    let tokenData = null;
    
    // Check if using API key
    if (apiKey && apiKey === MICROSERVICE_API_KEY) {
      isAuthorized = true;
    }
    // Check if using JWT
    else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokenData = verifyToken(token);
      
      if (tokenData && tokenData.botId === botId) {
        isAuthorized = true;
      }
    }
    
    // If not authorized, return error
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get bot from database
    const bots = await executeQuery(
      'SELECT id, whatsapp_session, user_id FROM whatsapp_bots WHERE id = ?',
      [botId]
    );
    
    if (bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    
    const bot = bots[0];
    
    // Check if session exists
    if (!bot.whatsapp_session) {
      return NextResponse.json({ error: 'No session available for this bot' }, { status: 404 });
    }
    
    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(bot.whatsapp_session);
    } catch (error) {
      console.error('Error parsing session data:', error);
      return NextResponse.json({ error: 'Invalid session data' }, { status: 500 });
    }
    
    // Generate a new token if one doesn't exist yet
    if (!tokenData) {
      // Get encryption key for this bot
      const encryptionKey = getBotEncryptionKey(botId);
      
      // Encrypt session data for extra security
      const encryptedSession = encryptData(JSON.stringify(sessionData), encryptionKey);
      
      // Generate JWT with expiration (1 hour by default)
      const token = generateSessionToken(botId, encryptedSession);
      
      // Calculate expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 1); // 1 hour from now
      
      return NextResponse.json({
        botId,
        session: sessionData,
        token,
        expires_at: expiryTime.toISOString()
      });
    }
    
    // If token already exists and was validated, return the session data from the token
    // Decrypt the session data from the token
    const encryptionKey = getBotEncryptionKey(botId);
    let sessionFromToken;
    
    try {
      sessionFromToken = JSON.parse(decryptData(tokenData.session, encryptionKey));
    } catch (error) {
      console.error('Error decrypting session data from token:', error);
      
      // Fall back to database session if token decryption fails
      sessionFromToken = sessionData;
    }
    
    // Calculate token expiry time
    const expiryTime = new Date(tokenData.exp * 1000);
    
    return NextResponse.json({
      botId,
      session: sessionFromToken,
      expires_at: expiryTime.toISOString()
    });
    
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Endpoint to generate a new session token
export async function POST(request, { params }) {
  try {
    // Extract the bot ID from path params
    const botId = params.botId;
    
    // Get authorization header and API key
    const headers = new Headers(request.headers);
    const apiKey = headers.get('x-api-key');
    const userId = headers.get('x-user-id');
    
    // Verify API key or user authentication
    if (!apiKey || apiKey !== MICROSERVICE_API_KEY) {
      // If not using API key, check user authentication
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Verify the bot belongs to the user
      const botOwnership = await executeQuery(
        'SELECT 1 FROM whatsapp_bots WHERE id = ? AND user_id = ?',
        [botId, userId]
      );
      
      if (botOwnership.length === 0) {
        return NextResponse.json({ error: 'Bot not found or unauthorized' }, { status: 404 });
      }
    }
    
    // Get bot from database
    const bots = await executeQuery(
      'SELECT id, whatsapp_session FROM whatsapp_bots WHERE id = ?',
      [botId]
    );
    
    if (bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    
    const bot = bots[0];
    
    // Check if session exists
    if (!bot.whatsapp_session) {
      return NextResponse.json({ error: 'No session available for this bot' }, { status: 404 });
    }
    
    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(bot.whatsapp_session);
    } catch (error) {
      console.error('Error parsing session data:', error);
      return NextResponse.json({ error: 'Invalid session data' }, { status: 500 });
    }
    
    // Get encryption key for this bot
    const encryptionKey = getBotEncryptionKey(botId);
    
    // Encrypt session data
    const encryptedSession = encryptData(JSON.stringify(sessionData), encryptionKey);
    
    // Get token options from request body
    const { expiresIn = '1h' } = await request.json().catch(() => ({}));
    
    // Generate JWT
    const token = generateSessionToken(botId, encryptedSession, expiresIn);
    
    // Calculate expiry time based on expiresIn
    // This is a simplified calculation and might not be accurate for all formats
    const expiryTime = new Date();
    if (expiresIn.endsWith('h')) {
      const hours = parseInt(expiresIn);
      expiryTime.setHours(expiryTime.getHours() + hours);
    } else if (expiresIn.endsWith('m')) {
      const minutes = parseInt(expiresIn);
      expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
    } else if (expiresIn.endsWith('d')) {
      const days = parseInt(expiresIn);
      expiryTime.setDate(expiryTime.getDate() + days);
    }
    
    return NextResponse.json({
      token,
      expires_at: expiryTime.toISOString()
    });
    
  } catch (error) {
    console.error('Error generating session token:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 