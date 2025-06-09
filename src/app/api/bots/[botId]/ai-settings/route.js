import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

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

    // First verify the bot belongs to the user and check tier features
    const botInfo = await executeQuery(`
      SELECT 
        wb.id,
        bf.feature_value
      FROM whatsapp_bots wb
      JOIN subscription_plans sp ON wb.plan_id = sp.id
      LEFT JOIN bot_features bf ON sp.id = bf.plan_id AND bf.feature_key = 'ai_replies'
      WHERE wb.id = ? AND wb.user_id = ?
    `, [botId, userId]);

    if (botInfo.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if the tier has ai_replies feature
    const aiRepliesFeature = botInfo[0].feature_value ? JSON.parse(botInfo[0].feature_value) : null;
    if (!aiRepliesFeature || aiRepliesFeature === false) {
      return NextResponse.json(
        { error: 'AI replies feature not available in your subscription tier' },
        { status: 403 }
      );
    }

    // Get request body
    const { max_ai_per_day, gpt_model } = await request.json();

    // Validate required fields
    if (typeof max_ai_per_day !== 'number' || !gpt_model) {
      return NextResponse.json(
        { error: 'Max AI per day and GPT model are required' },
        { status: 400 }
      );
    }

    // Check if AI settings already exist
    const existingSettings = await executeQuery(`
      SELECT id
      FROM bot_settings
      WHERE bot_id = ? AND JSON_EXTRACT(config_json, '$.type') = 'ai_settings'
    `, [botId]);

    const configJson = JSON.stringify({
      type: 'ai_settings',
      max_ai_per_day,
      gpt_model,
      updated_at: new Date().toISOString()
    });

    if (existingSettings.length > 0) {
      // Update existing settings
      await executeQuery(`
        UPDATE bot_settings
        SET config_json = ?
        WHERE id = ?
      `, [configJson, existingSettings[0].id]);
    } else {
      // Insert new settings
      await executeQuery(`
        INSERT INTO bot_settings (
          id,
          bot_id,
          config_json
        ) VALUES (?, ?, ?)
      `, [uuidv4(), botId, configJson]);
    }

    return NextResponse.json({
      success: true,
      message: 'AI settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 