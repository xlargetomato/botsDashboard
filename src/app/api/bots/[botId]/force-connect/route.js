import { NextResponse } from 'next/server';
import { validateBotStatus } from '@/lib/utils/botUtils';
import { executeQuery } from '@/lib/db/config';
import { randomUUID } from 'crypto';

// Only allow this in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Force connect a bot (for development/testing)
export async function POST(request, { params }) {
  try {
    // Only allow this in development mode for testing
    if (!isDevelopment) {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }
    
    // Fix NextJS warning by accessing params correctly
    const botId = params.botId.toString();
    console.log(`Force connect request for bot ${botId}`);
    
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      console.log(`Unauthorized force connect request for bot ${botId}`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validate bot status using the utility function
    const { isValid, bot, error } = await validateBotStatus(botId, userId);
    
    if (!isValid) {
      // If bot is expired or has other issues
      console.log(`Invalid bot status for ${botId}: ${error}`);
      return NextResponse.json(
        { error },
        { status: error === 'Bot not found' ? 404 : 403 }
      );
    }
    
    // If bot is already active, return success
    if (bot.status === 'active') {
      console.log(`Bot ${botId} is already active`);
      return NextResponse.json({ success: true, active: true });
    }
    
    try {
      // Get bot details
      const bots = await executeQuery(
        'SELECT subscription_id FROM whatsapp_bots WHERE id = ?',
        [botId]
      );
      
      if (bots.length === 0) {
        console.error(`Bot ${botId} not found`);
        return NextResponse.json(
          { error: 'Bot not found' },
          { status: 404 }
        );
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
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        );
      }
      
      const durationInDays = subscriptions[0].duration_in_days;
      
      // Update the bot in the database
      await executeQuery(`
        UPDATE whatsapp_bots
        SET 
          whatsapp_session = ?,
          activated_at = NOW(),
          expires_at = DATE_ADD(NOW(), INTERVAL ? DAY),
          status = 'active'
        WHERE id = ?
      `, [JSON.stringify({ sessionId: randomUUID() }), durationInDays, botId]);
      
      console.log(`Bot ${botId} saved to database as active`);
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error saving bot connection:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in force connect:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 