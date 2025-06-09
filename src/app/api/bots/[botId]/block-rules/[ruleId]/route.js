import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// Delete a block rule
export async function DELETE(request, { params }) {
  try {
    // Get bot ID and rule ID from params
    const { botId, ruleId } = params;
    
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

    // Check if the rule exists and belongs to the bot
    const ruleExists = await executeQuery(`
      SELECT 1
      FROM bot_block_rules
      WHERE id = ? AND bot_id = ?
    `, [ruleId, botId]);

    if (ruleExists.length === 0) {
      return NextResponse.json(
        { error: 'Block rule not found' },
        { status: 404 }
      );
    }

    // Delete the rule
    await executeQuery(`
      DELETE FROM bot_block_rules
      WHERE id = ?
    `, [ruleId]);

    return NextResponse.json({
      success: true,
      message: 'Block rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting block rule:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 