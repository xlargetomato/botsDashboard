import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
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

    // Get request body
    const { subscription_id, bot_name } = await request.json();

    // Validate required fields
    if (!subscription_id) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Use default name if not provided
    const botName = bot_name || 'MyBot';

    // Validate subscription belongs to user, is active, and has available slots
    const subscriptions = await executeQuery(`
      SELECT 
        s.id, 
        s.plan_id,
        sp.max_bots_allowed,
        (
          SELECT COUNT(*) 
          FROM whatsapp_bots wb 
          WHERE wb.subscription_id = s.id
        ) as bots_created
      FROM subscriptions s
      INNER JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE 
        s.id = ? 
        AND s.user_id = ?
        AND s.expired_date > NOW()
        AND s.status IN ('active', 'available')
    `, [subscription_id, userId]);

    // Check if subscription exists and belongs to user
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired subscription' },
        { status: 400 }
      );
    }

    const subscription = subscriptions[0];
    
    // Check if subscription has available slots
    if (subscription.bots_created >= subscription.max_bots_allowed) {
      return NextResponse.json(
        { error: 'Maximum number of bots reached for this subscription' },
        { status: 400 }
      );
    }

    // Generate a new UUID for the bot
    const botId = uuidv4();

    // Insert new bot
    await executeQuery(`
      INSERT INTO whatsapp_bots (
        id, 
        user_id, 
        subscription_id, 
        plan_id,
        name, 
        status, 
        activated_at, 
        expires_at, 
        whatsapp_session
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL)
    `, [botId, userId, subscription_id, subscription.plan_id, botName]);

    // Return success with bot ID
    return NextResponse.json({ 
      success: true, 
      bot_id: botId,
      message: 'Bot created successfully'
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 