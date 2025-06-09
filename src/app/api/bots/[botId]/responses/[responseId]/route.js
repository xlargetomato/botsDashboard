import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// Update a response
export async function PUT(request, { params }) {
  try {
    // Get bot ID and response ID from params
    const { botId, responseId } = params;
    
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

    // Check if the response exists and belongs to the bot
    const responseExists = await executeQuery(`
      SELECT 1
      FROM bot_responses
      WHERE id = ? AND bot_id = ?
    `, [responseId, botId]);

    if (responseExists.length === 0) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Get request body
    const { trigger_text, response_text, response_type, media_url, conditions, is_active } = await request.json();

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

    // Update the response
    await executeQuery(`
      UPDATE bot_responses
      SET 
        trigger_text = ?,
        response_text = ?,
        response_type = ?,
        media_url = ?,
        conditions_json = ?,
        is_active = ?
      WHERE id = ?
    `, [
      trigger_text,
      response_text,
      response_type,
      media_url || null,
      conditions ? JSON.stringify(conditions) : null,
      is_active !== undefined ? is_active : true,
      responseId
    ]);

    return NextResponse.json({
      success: true,
      message: 'Response updated successfully'
    });
  } catch (error) {
    console.error('Error updating response:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Delete a response
export async function DELETE(request, { params }) {
  try {
    // Get bot ID and response ID from params
    const { botId, responseId } = params;
    
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

    // Check if the response exists and belongs to the bot
    const responseExists = await executeQuery(`
      SELECT 1
      FROM bot_responses
      WHERE id = ? AND bot_id = ?
    `, [responseId, botId]);

    if (responseExists.length === 0) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Delete the response
    await executeQuery(`
      DELETE FROM bot_responses
      WHERE id = ?
    `, [responseId]);

    return NextResponse.json({
      success: true,
      message: 'Response deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting response:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 