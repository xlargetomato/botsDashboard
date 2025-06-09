import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

export async function GET(request, { params }) {
  try {
    // Get bot ID from params
    const botId = params.botId;
    
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First verify the bot belongs to the user
    const botOwnership = await executeQuery(`
      SELECT 1
      FROM whatsapp_bots wb
      WHERE wb.id = ? AND wb.user_id = ?
    `, [botId, userId]);

    if (botOwnership.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get basic bot information
    const botInfo = await executeQuery(`
      SELECT 
        wb.id,
        wb.name,
        wb.status,
        wb.activated_at,
        wb.expires_at,
        s.id as subscription_id,
        sp.id as tier_id,
        sp.name as tier_name,
        DATEDIFF(s.expired_date, NOW()) as days_left
      FROM whatsapp_bots wb
      JOIN subscriptions s ON wb.subscription_id = s.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE wb.id = ?
    `, [botId]);

    if (botInfo.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Get feature flags and limits for the bot's tier
    let features = [];
    try {
      features = await executeQuery(`
        SELECT 
          bf.feature_key,
          bf.feature_value
        FROM bot_features bf
        WHERE bf.plan_id = ?
      `, [botInfo[0].tier_id]);
    } catch (error) {
      console.error('Error fetching bot features:', error);
      // Continue with empty features
    }

    // Get working hours
    let workingHours = [];
    try {
      workingHours = await executeQuery(`
        SELECT 
          day_of_week,
          from_time,
          to_time
        FROM bot_working_hours
        WHERE bot_id = ?
        ORDER BY day_of_week ASC
      `, [botId]);
    } catch (error) {
      console.error('Error fetching working hours:', error);
      // Continue with empty working hours
    }

    // Get blocking rules
    let blockRules = [];
    try {
      blockRules = await executeQuery(`
        SELECT 
          id,
          pattern,
          block_message,
          is_active
        FROM bot_block_rules
        WHERE bot_id = ?
      `, [botId]);
    } catch (error) {
      console.error('Error fetching block rules:', error);
      // Continue with empty block rules
    }

    // Get AI settings
    let aiSettings = [];
    try {
      aiSettings = await executeQuery(`
        SELECT config_json
        FROM bot_settings
        WHERE bot_id = ? AND JSON_EXTRACT(config_json, '$.type') = 'ai_settings'
        LIMIT 1
      `, [botId]);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      // Continue with empty AI settings
    }

    // Get welcome message
    let welcomeMessage = [];
    try {
      welcomeMessage = await executeQuery(`
        SELECT config_json
        FROM bot_settings
        WHERE bot_id = ? AND JSON_EXTRACT(config_json, '$.type') = 'welcome_message'
        LIMIT 1
      `, [botId]);
    } catch (error) {
      console.error('Error fetching welcome message:', error);
      // Continue with empty welcome message
    }

    // Get responses
    let responses = [];
    try {
      responses = await executeQuery(`
        SELECT 
          id,
          trigger_text,
          response_text,
          response_type,
          media_url,
          conditions_json,
          is_active
        FROM bot_responses
        WHERE bot_id = ?
      `, [botId]);
    } catch (error) {
      console.error('Error fetching responses:', error);
      // Continue with empty responses
    }

    // Get statistics
    let messageStats = {
      messages_sent: 0,
      messages_received: 0,
      active_users: 0
    };
    
    try {
      const statsResult = await executeQuery(`
        SELECT 
          COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as messages_sent,
          COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as messages_received,
          COUNT(DISTINCT recipient) as active_users
        FROM whatsapp_messages
        WHERE bot_id = ?
      `, [botId]);
      
      if (statsResult && statsResult.length > 0) {
        messageStats = statsResult[0];
      }
    } catch (error) {
      console.error('Error fetching message stats, using defaults:', error);
      // Continue with default stats
    }

    // Format the response
    const response = {
      bot: {
        ...botInfo[0],
        features: features.map(f => ({
          feature_key: f.feature_key,
          value: JSON.parse(f.feature_value)
        }))
      },
      stats: messageStats,
      settings: {
        working_hours: workingHours,
        block_rules: blockRules,
        ai_settings: aiSettings.length > 0 ? JSON.parse(aiSettings[0].config_json) : null,
        welcome_message: welcomeMessage.length > 0 ? JSON.parse(welcomeMessage[0].config_json) : { is_default: true, message: '' },
        responses: responses
      }
    };

    return NextResponse.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Error fetching bot details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Update basic bot information
export async function PUT(request, { params }) {
  try {
    // Get bot ID from params
    const botId = params.botId;
    
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First verify the bot belongs to the user
    const botOwnership = await executeQuery(`
      SELECT 1
      FROM whatsapp_bots wb
      WHERE wb.id = ? AND wb.user_id = ?
    `, [botId, userId]);

    if (botOwnership.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get request body
    const { name } = await request.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Bot name is required' },
        { status: 400 }
      );
    }

    // Update bot name
    await executeQuery(`
      UPDATE whatsapp_bots
      SET name = ?
      WHERE id = ?
    `, [name, botId]);

    return NextResponse.json({
      success: true,
      message: 'Bot updated successfully'
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 