import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// Add a new block rule
export async function POST(request, { params }) {
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

    // First verify the bot belongs to the user and check tier features
    const botInfo = await executeQuery(`
      SELECT 
        wb.id,
        bf.feature_value
      FROM whatsapp_bots wb
      JOIN subscription_plans sp ON wb.plan_id = sp.id
      LEFT JOIN bot_features bf ON sp.id = bf.plan_id AND bf.feature_key = 'block_rules'
      WHERE wb.id = ? AND wb.user_id = ?
    `, [botId, userId]);

    if (botInfo.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if the tier has block_rules feature
    const blockRulesFeature = botInfo[0].feature_value ? JSON.parse(botInfo[0].feature_value) : null;
    if (!blockRulesFeature || blockRulesFeature === false) {
      return NextResponse.json(
        { error: 'Block rules feature not available in your subscription tier' },
        { status: 403 }
      );
    }

    // Get request body
    const { pattern, block_message } = await request.json();

    // Validate required fields
    if (!pattern || !block_message) {
      return NextResponse.json(
        { error: 'Pattern and block message are required' },
        { status: 400 }
      );
    }

    // Insert new block rule
    const ruleId = uuidv4();
    await executeQuery(`
      INSERT INTO bot_block_rules (
        id,
        bot_id,
        pattern,
        block_message,
        is_active
      ) VALUES (?, ?, ?, ?, TRUE)
    `, [ruleId, botId, pattern, block_message]);

    return NextResponse.json({
      success: true,
      id: ruleId,
      message: 'Block rule added successfully'
    });
  } catch (error) {
    console.error('Error adding block rule:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 