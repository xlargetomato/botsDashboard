import { NextResponse } from 'next/server';
import { validateConfig } from '@/lib/paylink/service';
import { getAuthToken } from '@/lib/paylink/api';
import PAYLINK_CONFIG from '@/lib/paylink/config';

/**
 * API route to check Paylink API status and configuration
 */
export async function GET() {
  try {
    // First validate the configuration
    const configStatus = validateConfig();
    
    // If configuration is invalid, return error details
    if (!configStatus.isValid) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid Paylink configuration',
        details: {
          missingVars: configStatus.missingVars,
          isProduction: PAYLINK_CONFIG.IS_PRODUCTION,
        }
      }, { status: 400 });
    }
    
    // Try to get an authentication token to verify credentials
    try {
      const authToken = await getAuthToken();
      
      if (!authToken) {
        return NextResponse.json({
          status: 'error',
          message: 'Failed to authenticate with Paylink API',
          details: {
            isProduction: PAYLINK_CONFIG.IS_PRODUCTION,
            apiUrl: PAYLINK_CONFIG.BASE_URL,
          }
        }, { status: 401 });
      }
      
      // Return successful status with details
      return NextResponse.json({
        status: 'ok',
        message: 'Paylink API connection successful',
        details: {
          isProduction: PAYLINK_CONFIG.IS_PRODUCTION,
          apiUrl: PAYLINK_CONFIG.BASE_URL,
          tokenExpiry: authToken.expiresAt || null,
        }
      });
    } catch (apiError) {
      return NextResponse.json({
        status: 'error',
        message: 'Paylink API connection failed',
        error: apiError.message,
        details: {
          isProduction: PAYLINK_CONFIG.IS_PRODUCTION,
          apiUrl: PAYLINK_CONFIG.BASE_URL
        }
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Server error checking Paylink status',
      error: error.message
    }, { status: 500 });
  }
}
