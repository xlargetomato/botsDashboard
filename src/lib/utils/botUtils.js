import { executeQuery } from '../db/config.js';

/**
 * Validates a bot's status to ensure it can be used
 * @param {string} botId - The ID of the bot to validate
 * @param {string} userId - The ID of the user who owns the bot
 * @returns {Promise<{isValid: boolean, bot: object|null, error: string|null}>}
 */
export async function validateBotStatus(botId, userId) {
  try {
    // Get bot details including expiration date
    const bots = await executeQuery(
      `SELECT 
        id, 
        user_id, 
        status, 
        activated_at, 
        expires_at,
        subscription_id,
        TIMESTAMPDIFF(SECOND, NOW(), expires_at) as seconds_to_expiry
      FROM whatsapp_bots 
      WHERE id = ? AND user_id = ?`,
      [botId, userId]
    );
    
    // If bot doesn't exist or doesn't belong to this user
    if (bots.length === 0) {
      return { isValid: false, bot: null, error: 'Bot not found' };
    }
    
    const bot = bots[0];
    
    // Check if bot has expired
    if (bot.status === 'active' && bot.seconds_to_expiry <= 0) {
      // Update status to expired
      await executeQuery(
        'UPDATE whatsapp_bots SET status = "expired" WHERE id = ?',
        [botId]
      );
      
      return { isValid: false, bot: null, error: 'Bot has expired' };
    }
    
    // Bot is valid
    return { isValid: true, bot, error: null };
  } catch (error) {
    console.error('Error validating bot status:', error);
    return { isValid: false, bot: null, error: 'Server error' };
  }
}

/**
 * Get the remaining days until a bot expires
 * @param {Date} expiresAt - The expiration date
 * @returns {number} - Number of days remaining (0 if expired)
 */
export function getRemainingDays(expiresAt) {
  const now = new Date();
  const expDate = new Date(expiresAt);
  
  // If already expired, return 0
  if (expDate <= now) {
    return 0;
  }
  
  // Calculate days difference
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export default {
  validateBotStatus,
  getRemainingDays
}; 