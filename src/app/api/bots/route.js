import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

export async function GET(request) {
  try {
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query to get all bots for the user with tier information and days left
    const bots = await executeQuery(`
      SELECT 
        wb.id as bot_id,
        wb.name,
        wb.status,
        sp.name as tier_name,
        s.id as subscription_id,
        DATEDIFF(s.expired_date, NOW()) as days_left
      FROM whatsapp_bots wb
      JOIN subscriptions s ON wb.subscription_id = s.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE wb.user_id = ?
      ORDER BY wb.created_at DESC
    `, [userId]);

    // Return the bots list
    return NextResponse.json({ 
      success: true,
      bots
    });
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 