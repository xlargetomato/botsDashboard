import { NextResponse } from 'next/server';
import { checkBotExpiration } from '@/lib/middleware/botExpirationCheck';
import { getRemainingDays } from '@/lib/utils/botUtils';

export async function GET(request, { params }) {
  try {
    const { botId } = params;
    
    // Check bot expiration status
    const { response, isValid, bot } = await checkBotExpiration(request, botId);
    
    // If not valid, return the error response
    if (!isValid) {
      return response;
    }
    
    // Calculate remaining days
    const remainingDays = getRemainingDays(bot.expires_at);
    
    // Return bot status information
    return NextResponse.json({
      id: bot.id,
      name: bot.name,
      status: bot.status,
      expires_at: bot.expires_at,
      remaining_days: remainingDays
    });
  } catch (error) {
    console.error('Error checking bot status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 