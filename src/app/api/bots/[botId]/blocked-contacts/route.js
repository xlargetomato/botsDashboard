import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// Get all blocked contacts for a bot
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

    // Get blocked contacts (only active ones)
    const blockedContacts = await executeQuery(`
      SELECT * FROM whatsapp_blocked_contacts
      WHERE bot_id = ? AND is_active = TRUE
      ORDER BY blocked_at DESC
    `, [botId]);

    return NextResponse.json(blockedContacts);
  } catch (error) {
    console.error('Error fetching blocked contacts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Block a new contact
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
    const { contact_jid, reason, block_type } = await request.json();

    // Validate required fields
    if (!contact_jid) {
      return NextResponse.json(
        { error: 'Contact JID is required' },
        { status: 400 }
      );
    }

    // Format JID if needed
    let formattedJid = contact_jid;
    if (!formattedJid.includes('@')) {
      formattedJid = `${formattedJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    }

    // Determine expiry date based on block type
    const expiresAt = block_type === 'temporary' 
      ? 'DATE_ADD(NOW(), INTERVAL 1 DAY)' 
      : 'NULL';

    // Insert or update blocked contact
    const contactId = uuidv4();
    await executeQuery(`
      INSERT INTO whatsapp_blocked_contacts (
        id,
        bot_id,
        contact_jid,
        reason,
        expires_at,
        is_active
      ) VALUES (?, ?, ?, ?, ${expiresAt}, TRUE)
      ON DUPLICATE KEY UPDATE 
        reason = VALUES(reason),
        expires_at = VALUES(expires_at),
        is_active = TRUE,
        blocked_at = NOW()
    `, [contactId, botId, formattedJid, reason || 'Manually blocked']);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Contact blocked successfully',
      id: contactId
    });
  } catch (error) {
    console.error('Error blocking contact:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 