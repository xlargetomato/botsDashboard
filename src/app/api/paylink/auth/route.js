import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAuthToken } from '@/lib/paylink/api';

/**
 * GET handler to fetch Paylink auth token
 * This is primarily for testing the Paylink authentication
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Paylink auth token
    const token = await getAuthToken();
    
    return NextResponse.json({
      success: true,
      token: token
    });
  } catch (error) {
    console.error('Error getting Paylink auth token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to authenticate with Paylink',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
