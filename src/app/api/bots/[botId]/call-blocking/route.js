import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// Get call blocking settings
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

    // Get call blocking settings
    const settings = await executeQuery(`
      SELECT * FROM call_blocking_settings
      WHERE bot_id = ?
    `, [botId]);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        id: uuidv4(),
        bot_id: botId,
        auto_reply_message: 'Sorry, your call has been blocked.',
        daily_call_limit: 3,
        block_type: 'temporary',
        is_enabled: false
      };

      await executeQuery(`
        INSERT INTO call_blocking_settings (
          id,
          bot_id,
          auto_reply_message,
          daily_call_limit,
          block_type,
          is_enabled
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        defaultSettings.id,
        defaultSettings.bot_id,
        defaultSettings.auto_reply_message,
        defaultSettings.daily_call_limit,
        defaultSettings.block_type,
        defaultSettings.is_enabled
      ]);

      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Error fetching call blocking settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Update call blocking settings
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

    // Get request body
    const { auto_reply_message, daily_call_limit, block_type, is_enabled } = await request.json();

    // Validate required fields
    if (daily_call_limit === undefined || !block_type || is_enabled === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update or insert settings
    const existingSettings = await executeQuery(`
      SELECT id FROM call_blocking_settings
      WHERE bot_id = ?
    `, [botId]);

    if (existingSettings.length > 0) {
      // Update existing settings
      await executeQuery(`
        UPDATE call_blocking_settings
        SET 
          auto_reply_message = ?,
          daily_call_limit = ?,
          block_type = ?,
          is_enabled = ?,
          updated_at = NOW()
        WHERE bot_id = ?
      `, [
        auto_reply_message || 'Sorry, your call has been blocked.',
        daily_call_limit,
        block_type,
        is_enabled,
        botId
      ]);
    } else {
      // Insert new settings
      const settingsId = uuidv4();
      await executeQuery(`
        INSERT INTO call_blocking_settings (
          id,
          bot_id,
          auto_reply_message,
          daily_call_limit,
          block_type,
          is_enabled
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        settingsId,
        botId,
        auto_reply_message || 'Sorry, your call has been blocked.',
        daily_call_limit,
        block_type,
        is_enabled
      ]);
    }

    // Return updated settings
    const updatedSettings = await executeQuery(`
      SELECT * FROM call_blocking_settings
      WHERE bot_id = ?
    `, [botId]);

    return NextResponse.json({
      success: true,
      message: 'Call blocking settings updated successfully',
      settings: updatedSettings[0]
    });
  } catch (error) {
    console.error('Error updating call blocking settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 