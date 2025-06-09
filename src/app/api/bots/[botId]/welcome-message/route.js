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
    const { is_default, message } = await request.json();

    // Validate required fields
    if (typeof is_default !== 'boolean') {
      return NextResponse.json(
        { error: 'is_default field is required' },
        { status: 400 }
      );
    }

    if (!is_default && !message) {
      return NextResponse.json(
        { error: 'Message is required when not using default' },
        { status: 400 }
      );
    }

    // Check if welcome message settings already exist
    const existingSettings = await executeQuery(`
      SELECT id
      FROM bot_settings
      WHERE bot_id = ? AND JSON_EXTRACT(config_json, '$.type') = 'welcome_message'
    `, [botId]);

    const configJson = JSON.stringify({
      type: 'welcome_message',
      is_default,
      message: is_default ? '' : message,
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
      message: 'Welcome message updated successfully'
    });
  } catch (error) {
    console.error('Error updating welcome message:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 