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

    // Get request body (array of working hours)
    const workingHours = await request.json();

    if (!Array.isArray(workingHours)) {
      return NextResponse.json(
        { error: 'Working hours must be an array' },
        { status: 400 }
      );
    }

    // Validate working hours
    for (const hours of workingHours) {
      if (
        typeof hours.day_of_week !== 'number' ||
        hours.day_of_week < 0 ||
        hours.day_of_week > 6 ||
        !hours.from_time ||
        !hours.to_time
      ) {
        return NextResponse.json(
          { error: 'Invalid working hours format' },
          { status: 400 }
        );
      }
    }

    // Begin transaction
    await executeQuery('START TRANSACTION');

    try {
      // Delete existing working hours
      await executeQuery(`
        DELETE FROM bot_working_hours
        WHERE bot_id = ?
      `, [botId]);

      // Insert new working hours
      for (const hours of workingHours) {
        await executeQuery(`
          INSERT INTO bot_working_hours (
            id,
            bot_id,
            day_of_week,
            from_time,
            to_time
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          botId,
          hours.day_of_week,
          hours.from_time,
          hours.to_time
        ]);
      }

      // Commit transaction
      await executeQuery('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Working hours updated successfully'
      });
    } catch (error) {
      // Rollback transaction on error
      await executeQuery('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating working hours:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 