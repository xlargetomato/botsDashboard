/**
 * Paylink.sa API Client
 * 
 * This file contains the utility functions to interact with the Paylink.sa API.
 * Reference: https://developer.paylink.sa
 */

import PAYLINK_CONFIG from './config';

// Cache for the authentication token
let tokenCache = {
  token: null,
  expiry: null
};

/**
 * Get authentication token from Paylink.sa
 * @returns {Promise<string>} Authentication token
 */
export async function getAuthToken() {
  // Check if we have a valid cached token
  if (tokenCache.token && tokenCache.expiry && new Date() < tokenCache.expiry) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(`${PAYLINK_CONFIG.BASE_URL}${PAYLINK_CONFIG.ENDPOINTS.AUTH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id_token: PAYLINK_CONFIG.ID_TOKEN
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Paylink auth error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Store token with expiry (subtract 5 minutes to be safe)
    const expiryMs = data.expires_in * 1000;
    tokenCache = {
      token: data.id_token,
      expiry: new Date(Date.now() + expiryMs - 300000) // Expires 5 minutes early for safety
    };

    return data.id_token;
  } catch (error) {
    console.error('Error getting Paylink auth token:', error);
    throw error;
  }
}

/**
 * Make an authenticated request to Paylink.sa API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request payload
 * @returns {Promise<object>} API response
 */
export async function paylinkRequest(endpoint, method = 'GET', data = null) {
  try {
    const token = await getAuthToken();
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const url = `${PAYLINK_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Paylink API error: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in Paylink request to ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Create a new invoice
 * @param {object} invoiceData - Invoice data
 * @returns {Promise<object>} Created invoice
 */
export async function createInvoice(invoiceData) {
  return paylinkRequest(PAYLINK_CONFIG.ENDPOINTS.INVOICES, 'POST', invoiceData);
}

/**
 * Get invoice details
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>} Invoice details
 */
export async function getInvoice(invoiceId) {
  return paylinkRequest(`${PAYLINK_CONFIG.ENDPOINTS.INVOICES}/${invoiceId}`);
}

/**
 * Get available payment methods
 * @returns {Promise<object>} Available payment methods
 */
export async function getPaymentMethods() {
  return paylinkRequest(PAYLINK_CONFIG.ENDPOINTS.PAYMENT_METHODS);
}

/**
 * Generate a reference number for transactions
 * @param {string} prefix - Optional prefix for reference number
 * @returns {string} Generated reference number
 */
export function generateReferenceNumber(prefix = 'WP') {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Format amount as required by Paylink (2 decimal places)
 * @param {number} amount - Amount to format
 * @returns {number} Formatted amount
 */
export function formatAmount(amount) {
  return parseFloat(amount.toFixed(2));
}
