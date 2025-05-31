/**
 * Paylink.sa Configuration
 * 
 * This file contains the configuration settings for the Paylink.sa payment gateway integration.
 * Reference: https://developer.paylink.sa
 */

// Paylink API configuration - improved validation and warning messages
if (!process.env.PAYLINK_ID_TOKEN || !process.env.PAYLINK_SECRET) {
  console.warn('⚠️ WARNING: Paylink credentials (PAYLINK_ID_TOKEN and/or PAYLINK_SECRET) are missing from environment variables!');
}

if (!process.env.PAYLINK_CALLBACK_URL) {
  console.warn('⚠️ WARNING: PAYLINK_CALLBACK_URL is not set in environment variables. Using fallback URL detection, which may not work with external services!');
}

// Helper function to determine if we're in production mode
const isProduction = () => {
  return process.env.NODE_ENV === 'production' || process.env.PAYLINK_ENVIRONMENT === 'production';
};

// Get the appropriate base URL based on environment
const getBaseUrl = () => {
  // If explicitly set in .env, use that
  if (process.env.PAYLINK_BASE_URL) {
    return process.env.PAYLINK_BASE_URL;
  }
  
  // Otherwise use environment-appropriate URL
  return isProduction() 
    ? 'https://restapi.paylink.sa' // Production URL
    : 'https://restpilot.paylink.sa'; // Test URL
};

const PAYLINK_CONFIG = {
  // Environment settings
  IS_PRODUCTION: isProduction(),
  
  // API Base URLs - primary and fallback
  BASE_URL: getBaseUrl(),
  ALTERNATE_BASE_URL: isProduction() ? 'https://api.paylink.sa' : 'https://apitest.paylink.sa',
  
  // Paylink merchant credentials - using exact format from .env without modification
  ID_TOKEN: process.env.PAYLINK_ID_TOKEN || '',
  SECRET_KEY: process.env.PAYLINK_SECRET || '',
  API_ID: process.env.PAYLINK_ID_TOKEN || '', // Used directly as provided in .env
  
  // API endpoints - official paths from Paylink documentation
  ENDPOINTS: {
    // Authentication endpoints
    AUTH: '/api/auth',
    AUTH_ALTERNATE: '/api/token',
    
    // Invoice endpoints
    INVOICES: '/api/addInvoice',
    GET_INVOICE: '/api/getInvoice',
    
    // Customer endpoints
    CUSTOMERS: '/api/customers',
    
    // Webhook endpoints
    WEBHOOKS: '/api/webhooks',
    
    // Order endpoints
    ORDERS: '/api/orders',
    
    // Product endpoints
    PRODUCTS: '/api/products',
    
    // Transaction endpoints
    TRANSACTIONS: '/api/transactions',
    COMPLETE_AUTHENTICATION: '/api/auth/completeAuthentication', // Specific 3DS completion endpoint
    ALT_COMPLETE_AUTHENTICATION: '/rest/pay/ACSRedirection', // Alternative 3DS authentication endpoint
    
    // Other endpoints
    PAYMENT_METHODS: '/api/getPaymentMethods',
    PAYMENT_GATEWAYS: '/api/getPaymentGateways'
  },
  
  // Callback URL with improved detection for ngrok and other tunnels
  DEFAULT_CALLBACK_URL: (() => {
    // 1. Use explicitly configured callback URL if available
    if (process.env.PAYLINK_CALLBACK_URL) {
      return process.env.PAYLINK_CALLBACK_URL;
    }
    
    // 2. Use NGROK URL if available
    if (process.env.NGROK_URL) {
      return `${process.env.NGROK_URL}/api/paylink/callback`;
    }
    
    // 3. Use APP_URL if available
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return `${process.env.NEXT_PUBLIC_APP_URL}/api/paylink/callback`;
    }

    // 4. Try to auto-detect URL if in browser environment
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      return `${origin}/api/paylink/callback`;
    }
    
    // 5. Fallback to localhost (will be overridden at runtime with proper origin)
    return 'http://localhost:3000/api/paylink/callback';
  })(),
  
  // 3D Secure callback URL - critical for completing 3DS authentication
  DEFAULT_3DS_CALLBACK_URL: (() => {
    // 1. Use explicitly configured 3DS callback URL if available
    if (process.env.PAYLINK_3DS_CALLBACK_URL) {
      return process.env.PAYLINK_3DS_CALLBACK_URL;
    }
    
    // 2. Use NGROK URL if available
    if (process.env.NGROK_URL) {
      return `${process.env.NGROK_URL}/api/paylink/3ds-callback`;
    }
    
    // 3. Use APP_URL if available
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return `${process.env.NEXT_PUBLIC_APP_URL}/api/paylink/3ds-callback`;
    }

    // 4. Try to auto-detect URL if in browser environment
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      return `${origin}/api/paylink/3ds-callback`;
    }
    
    // 5. Fallback to localhost (will be overridden at runtime with proper origin)
    return 'http://localhost:3000/api/paylink/3ds-callback';
  })(),
  
  // Default currency
  CURRENCY: process.env.PAYLINK_CURRENCY || 'SAR',
  
  // Invoice settings
  DEFAULT_SUCCESS_URL: process.env.PAYLINK_SUCCESS_URL || '/dashboard/client/subscriptions/payment-status?status=success',
  DEFAULT_CANCEL_URL: process.env.PAYLINK_CANCEL_URL || '/dashboard/client/subscriptions/payment-status?status=cancelled',
  
  // System settings
  DEBUG_MODE: process.env.PAYLINK_DEBUG === 'true'
};

export default PAYLINK_CONFIG;
