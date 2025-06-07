import { NextResponse } from 'next/server';
import { validateBotStatus } from '../utils/botUtils';

/**
 * Middleware to check if a bot is active and not expired
 * 
 * @param {Request} request - The incoming request
 * @param {string} botId - The ID of the bot to check
 * @returns {Promise<{response: NextResponse|null, isValid: boolean, bot: object|null}>}
 */
export async function checkBotExpiration(request, botId) {
  try {
    // Get user ID from request headers (set by auth middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return {
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
        isValid: false,
        bot: null
      };
    }
    
    // Validate bot status
    const { isValid, bot, error } = await validateBotStatus(botId, userId);
    
    if (!isValid) {
      return {
        response: NextResponse.json(
          { error },
          { status: error === 'Bot not found' ? 404 : 403 }
        ),
        isValid: false,
        bot
      };
    }
    
    return {
      response: null,
      isValid: true,
      bot
    };
  } catch (error) {
    console.error('Error in bot expiration check middleware:', error);
    return {
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      isValid: false,
      bot: null
    };
  }
}

export default checkBotExpiration; 