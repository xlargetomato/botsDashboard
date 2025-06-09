/**
 * This is an example script demonstrating how a microservice would
 * retrieve and use a WhatsApp session from the main application
 */

import { fetchBotSession, generateSessionToken, isTokenExpired } from '../src/lib/utils/sessionUtils.js';

// Configuration (would normally be in environment variables)
const API_KEY = 'your-api-key-change-this';
const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = 'your-jwt-secret-key-change-this';

// Example function to initialize WhatsApp in the microservice
async function initializeWhatsAppForBot(botId) {
  try {
    console.log(`Initializing WhatsApp for bot ${botId}...`);
    
    // First, try to fetch the session
    let sessionData = await fetchBotSession(botId, API_KEY, BASE_URL);
    console.log('Session retrieved successfully');
    
    // Extract token and session
    const { token, session, expires_at } = sessionData;
    
    // Check if the token is about to expire (within 5 minutes)
    if (isTokenExpired(token, JWT_SECRET)) {
      console.log('Token is expired or about to expire, generating a new one...');
      
      // Generate a new token with longer expiration (e.g., 24 hours)
      const tokenData = await generateSessionToken(botId, API_KEY, BASE_URL, '24h');
      console.log(`New token generated, expires at: ${tokenData.expires_at}`);
      
      // Fetch the session again with the new token
      sessionData = await fetchBotSession(
        botId, 
        API_KEY, 
        BASE_URL, 
        tokenData.token
      );
    }
    
    // Use the session data to initialize WhatsApp client
    // This would depend on the specific WhatsApp library you're using
    console.log('Session data ready for WhatsApp initialization');
    console.log(`Session expires at: ${sessionData.expires_at}`);
    
    // Example of how you might use the session with Baileys
    // (actual implementation would depend on your specific setup)
    /*
    const { default: makeWASocket } = require('@whiskeysockets/baileys');
    
    // Initialize the WhatsApp client with the session
    const sock = makeWASocket({
      auth: sessionData.session,
      // other configuration options
    });
    
    // Set up event handlers, etc.
    */
    
    return {
      success: true,
      message: 'WhatsApp initialized successfully',
      expiresAt: sessionData.expires_at
    };
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Example usage
async function main() {
  // Replace with an actual bot ID
  const botId = '5fcf44b3-278e-4436-bbb1-433252b46c29';
  
  try {
    const result = await initializeWhatsAppForBot(botId);
    console.log('Initialization result:', result);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the example
main().catch(console.error);

// Note: To run this script, you would typically use:
// node --experimental-modules scripts/microservice-example.js 