import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { cleanupExpiredBlocks } from '@/lib/whatsapp/connection';

// Cron job to clean up expired blocks
export async function GET(request) {
  try {
    // Verify the API key
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the cleanup function
    const result = await cleanupExpiredBlocks();

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Expired blocks cleaned up successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to clean up expired blocks' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error cleaning up expired blocks:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 