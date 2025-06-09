import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// Get call history for a bot
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

    // Get call history
    const callHistory = await executeQuery(`
      SELECT wc.*, 
        CASE WHEN wb.contact_jid IS NOT NULL AND wb.is_active = TRUE 
          THEN TRUE ELSE FALSE 
        END as is_blocked
      FROM whatsapp_calls wc
      LEFT JOIN whatsapp_blocked_contacts wb 
        ON wc.caller_jid = wb.contact_jid AND wb.bot_id = wc.bot_id AND wb.is_active = TRUE
      WHERE wc.bot_id = ?
      ORDER BY wc.call_timestamp DESC
      LIMIT 100
    `, [botId]);

    // Get call statistics
    const callStats = await executeQuery(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN call_status = 'blocked' THEN 1 ELSE 0 END) as blocked_calls,
        SUM(CASE WHEN call_status = 'rejected' THEN 1 ELSE 0 END) as rejected_calls,
        SUM(CASE WHEN call_status = 'received' THEN 1 ELSE 0 END) as received_calls,
        DATE(call_timestamp) as call_date
      FROM whatsapp_calls
      WHERE bot_id = ? AND call_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(call_timestamp)
      ORDER BY call_date DESC
    `, [botId]);

    return NextResponse.json({
      calls: callHistory,
      statistics: callStats
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 