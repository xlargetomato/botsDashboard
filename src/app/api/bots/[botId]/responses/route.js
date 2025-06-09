import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// Add a new response
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
    const { trigger_text, response_text, response_type, media_url, conditions, chat_type } = await request.json();

    // Validate required fields
    if (!trigger_text || !response_text || !response_type) {
      return NextResponse.json(
        { error: 'Trigger, response text, and response type are required' },
        { status: 400 }
      );
    }

    // Validate response type
    const validResponseTypes = ['text', 'image', 'buttons', 'list', 'location', 'contact'];
    if (!validResponseTypes.includes(response_type)) {
      return NextResponse.json(
        { error: 'Invalid response type' },
        { status: 400 }
      );
    }

    // Validate chat type
    const validChatTypes = ['all', 'private', 'group'];
    if (chat_type && !validChatTypes.includes(chat_type)) {
      return NextResponse.json(
        { error: 'Invalid chat type' },
        { status: 400 }
      );
    }

    // Insert new response
    const responseId = uuidv4();
    await executeQuery(`
      INSERT INTO bot_responses (
        id,
        bot_id,
        trigger_text,
        response_text,
        response_type,
        media_url,
        conditions_json,
        chat_type,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `, [
      responseId,
      botId,
      trigger_text,
      response_text,
      response_type,
      media_url || null,
      conditions ? JSON.stringify(conditions) : null,
      chat_type || 'all'
    ]);

    return NextResponse.json({
      success: true,
      id: responseId,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Error adding response:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Get all responses for a bot
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

    // Get all responses for the bot
    const responses = await executeQuery(`
      SELECT 
        id, 
        trigger_text, 
        response_text, 
        response_type, 
        media_url, 
        conditions_json, 
        chat_type,
        is_active,
        created_at
      FROM bot_responses
      WHERE bot_id = ?
      ORDER BY created_at DESC
    `, [botId]);

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error getting responses:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 