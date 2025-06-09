import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// GET /api/bots/[botId]/call-settings
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

    // Verify the bot belongs to the user
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

    // Check if call settings exist in bot_settings table
    const botSettings = await executeQuery(`
      SELECT config_json
      FROM bot_settings
      WHERE bot_id = ?
    `, [botId]);

    // Default settings to return if none exist
    const defaultSettings = {
      block_all_calls: false,
      call_limit_per_day: 3,
      enable_call_limit: false,
      call_block_message: "Sorry, your call has been blocked according to system settings."
    };

    // If bot settings exist, extract call settings
    if (botSettings.length > 0 && botSettings[0].config_json) {
      try {
        const settings = JSON.parse(botSettings[0].config_json);
        if (settings.call_settings) {
          return NextResponse.json(settings.call_settings);
        }
      } catch (parseError) {
        console.error('Error parsing bot settings:', parseError);
      }
    }

    // Return default settings if none found
    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching call settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/bots/[botId]/call-settings
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

    // Verify the bot belongs to the user
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

    // Get call settings from request body
    const callSettings = await request.json();

    // Get existing bot settings
    const existingSettings = await executeQuery(`
      SELECT config_json
      FROM bot_settings
      WHERE bot_id = ?
    `, [botId]);

    let allSettings = {};
    
    // Parse existing settings if available
    if (existingSettings.length > 0 && existingSettings[0].config_json) {
      try {
        allSettings = JSON.parse(existingSettings[0].config_json);
      } catch (parseError) {
        console.error('Error parsing existing settings:', parseError);
      }
    }

    // Update call settings in the complete settings object
    allSettings.call_settings = callSettings;

    // Stringify the complete settings object
    const settingsJson = JSON.stringify(allSettings);

    // Update or insert settings
    if (existingSettings.length > 0) {
      // Update existing record
      await executeQuery(`
        UPDATE bot_settings
        SET config_json = ?, updated_at = NOW()
        WHERE bot_id = ?
      `, [settingsJson, botId]);
    } else {
      // Insert new record
      await executeQuery(`
        INSERT INTO bot_settings (bot_id, config_json, created_at, updated_at)
        VALUES (?, ?, NOW(), NOW())
      `, [botId, settingsJson]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating call settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 