import jwt from 'jsonwebtoken';

// This file contains utility functions for working with bot session tokens
// It's meant to be used by the microservice that needs to access the WhatsApp sessions

/**
 * Fetches a session token for a bot from the main server
 * @param {string} botId - The ID of the bot
 * @param {string} apiKey - The API key for authentication
 * @param {string} baseUrl - The base URL of the main server
 * @returns {Promise<Object>} - A promise that resolves to the session data
 */
export async function fetchBotSession(botId, apiKey, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/bots/${botId}/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch session: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching bot session:', error);
    throw error;
  }
}

/**
 * Generates a new session token for a bot from the main server
 * @param {string} botId - The ID of the bot
 * @param {string} apiKey - The API key for authentication
 * @param {string} baseUrl - The base URL of the main server
 * @param {string} expiresIn - Token expiration (e.g., '1h', '1d')
 * @returns {Promise<Object>} - A promise that resolves to the token data
 */
export async function generateSessionToken(botId, apiKey, baseUrl, expiresIn = '1h') {
  try {
    const response = await fetch(`${baseUrl}/api/bots/${botId}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ expiresIn })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to generate token: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating session token:', error);
    throw error;
  }
}

/**
 * Verifies a session token and returns the decoded data
 * @param {string} token - The JWT token to verify
 * @param {string} secretKey - The secret key used to sign the token
 * @returns {Object|null} - The decoded token payload or null if invalid
 */
export function verifySessionToken(token, secretKey) {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    console.error('Error verifying session token:', error.message);
    return null;
  }
}

/**
 * Checks if a token is expired or about to expire
 * @param {string} token - The JWT token to check
 * @param {string} secretKey - The secret key used to sign the token
 * @param {number} bufferSeconds - Buffer time in seconds (default: 300 = 5 minutes)
 * @returns {boolean} - True if the token is expired or about to expire
 */
export function isTokenExpired(token, secretKey, bufferSeconds = 300) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now + bufferSeconds;
  } catch (error) {
    console.error('Error checking token expiration:', error.message);
    return true;
  }
}

export default {
  fetchBotSession,
  generateSessionToken,
  verifySessionToken,
  isTokenExpired
}; 