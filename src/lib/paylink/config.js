/**
 * Paylink.sa Configuration
 * 
 * This file contains the configuration settings for the Paylink.sa payment gateway integration.
 * Reference: https://developer.paylink.sa
 */

// Paylink API configuration
const PAYLINK_CONFIG = {
  // API Base URL
  BASE_URL: 'https://restpilot.paylink.sa/api/v2', // Use 'https://restapi.paylink.sa/api/v2' for production
  
  // Paylink merchant credentials
  ID_TOKEN: process.env.PAYLINK_ID_TOKEN || 'your_id_token_here',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: '/auth',
    INVOICES: '/invoices',
    PAYMENT_METHODS: '/payment-methods',
    PAYMENT_GATEWAYS: '/payment-gateways'
  },
  
  // Default callback URL (will be overridden with dynamic URLs)
  DEFAULT_CALLBACK_URL: process.env.PAYLINK_CALLBACK_URL || 'http://localhost:3000/api/paylink/callback',
  
  // Default currency
  CURRENCY: 'SAR'
};

export default PAYLINK_CONFIG;
