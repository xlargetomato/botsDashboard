/**
 * Paylink.sa Payment Service
 * 
 * A streamlined implementation of the Paylink payment gateway integration
 * that addresses authentication, invoice creation, and callback handling issues.
 */

import { getAuthToken, createInvoice as apiCreateInvoice, getInvoice as apiGetInvoice } from './api';
import PAYLINK_CONFIG from './config';

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
 * @param {number|string} amount - Amount to format
 * @returns {number} Formatted amount
 */
export function formatAmount(amount) {
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) {
    console.error('Invalid amount provided to formatAmount:', amount);
    return 0.00; // Default to zero if invalid
  }
  
  return parseFloat(numAmount.toFixed(2));
}

/**
 * Create a new invoice for payment
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<Object>} The created invoice
 */
export async function createInvoice(invoiceData) {
  try {
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Creating Paylink invoice with data:', JSON.stringify(invoiceData, null, 2));
    }
    
    // Ensure invoice data is properly formatted
    const validatedData = { ...invoiceData };
    
    // Add a reference number if not present
    if (!validatedData.orderNumber) {
      validatedData.orderNumber = generateReferenceNumber();
    }
    
    // Ensure amount is properly formatted
    if (validatedData.amount) {
      validatedData.amount = formatAmount(validatedData.amount);
    }
    
    // Set default currency if not provided
    if (!validatedData.currency) {
      validatedData.currency = PAYLINK_CONFIG.CURRENCY;
    }
    
    // Fix callback URL format if provided
    if (validatedData.callBackUrl) {
      // Fix any double slashes that aren't part of the protocol
      validatedData.callBackUrl = validatedData.callBackUrl.replace(/([^:])\/{2,}/g, '$1/');
    }
    
    // Use the API layer to create the invoice
    const response = await apiCreateInvoice(validatedData);
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Invoice created successfully:', response);
    }
    
    return response;
  } catch (error) {
    console.error('Error creating Paylink invoice:', error);
    throw error;
  }
}

/**
 * Get invoice details
 * @param {string} invoiceId - The invoice ID
 * @returns {Promise<Object>} The invoice details
 */
export async function getInvoice(invoiceId) {
  try {
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Getting invoice details for ID: ${invoiceId}`);
    }
    
    return await apiGetInvoice(invoiceId);
  } catch (error) {
    console.error(`Error getting Paylink invoice ${invoiceId}:`, error);
    throw error;
  }
}

/**
 * Create a direct checkout for a subscription
 * @param {Object} paymentData - The payment data
 * @returns {Promise<Object>} The checkout details
 */
export async function createDirectCheckout(paymentData) {
  try {
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Creating direct checkout for payment:', paymentData);
    }
    
    // Validate essential data
    if (!paymentData.amount) {
      throw new Error('Payment amount is required');
    }
    
    // Generate a unique transaction ID if not provided
    const transactionId = paymentData.transactionId || generateReferenceNumber('SUB');
    
    // Prepare the callback URL with transaction tracking
    let callbackUrl = paymentData.callbackUrl || PAYLINK_CONFIG.DEFAULT_CALLBACK_URL;
    
    // Ensure callback URL has proper transaction tracking
    if (!callbackUrl.includes('?')) {
      callbackUrl = `${callbackUrl}?txn_id=${transactionId}`;
    } else if (!callbackUrl.includes('txn_id=')) {
      callbackUrl = `${callbackUrl}&txn_id=${transactionId}`;
    }
    
    // If subscription ID is provided, include it in the callback URL
    if (paymentData.subscriptionId && !callbackUrl.includes('subscription_id=')) {
      callbackUrl = callbackUrl.includes('?') 
        ? `${callbackUrl}&subscription_id=${paymentData.subscriptionId}` 
        : `${callbackUrl}?subscription_id=${paymentData.subscriptionId}`;
    }
    
    // Fix any double slashes in the callback URL
    callbackUrl = callbackUrl.replace(/([^:])\/{2,}/g, '$1/');
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Using callback URL:', callbackUrl);
    }
    
    // Create the invoice payload
    const invoiceData = {
      orderNumber: transactionId,
      amount: formatAmount(paymentData.amount),
      callBackUrl: callbackUrl,
      currency: paymentData.currency || PAYLINK_CONFIG.CURRENCY,
      // Add customer info if provided
      ...(paymentData.customerInfo && {
        clientName: paymentData.customerInfo.clientName || paymentData.customerInfo.name,
        clientEmail: paymentData.customerInfo.clientEmail || paymentData.customerInfo.email,
        clientMobile: paymentData.customerInfo.clientMobile || paymentData.customerInfo.phone
      }),
      // Add metadata for tracking
      metadata: JSON.stringify({
        subscription_id: paymentData.subscriptionId,
        transaction_id: transactionId,
        custom_data: paymentData.metadata || {}
      }),
      // Add products or use default
      products: paymentData.products || [{
        title: paymentData.planName || 'Subscription',
        price: formatAmount(paymentData.amount),
        qty: 1,
        description: paymentData.planDescription || 'Subscription payment'
      }]
    };
    
    // Create the invoice
    const invoice = await createInvoice(invoiceData);
    
    return {
      transactionId,
      invoiceId: invoice.invoiceId,
      paymentUrl: invoice.paymentUrl,
      callbackUrl,
      amount: formatAmount(paymentData.amount),
      currency: paymentData.currency || PAYLINK_CONFIG.CURRENCY,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating direct checkout:', error);
    throw error;
  }
}

/**
 * Validate Paylink environment configuration
 * @returns {Object} Configuration status
 */
export function validateConfig() {
  const missingVars = [];
  
  if (!PAYLINK_CONFIG.API_ID) missingVars.push('PAYLINK_ID_TOKEN');
  if (!PAYLINK_CONFIG.SECRET_KEY) missingVars.push('PAYLINK_SECRET');
  
  const isProduction = PAYLINK_CONFIG.IS_PRODUCTION;
  
  return {
    isValid: missingVars.length === 0,
    isProduction,
    environment: isProduction ? 'production' : 'test',
    missingVars,
    config: {
      baseUrl: PAYLINK_CONFIG.BASE_URL,
      callbackUrl: PAYLINK_CONFIG.DEFAULT_CALLBACK_URL,
      currency: PAYLINK_CONFIG.CURRENCY,
      hasApiId: !!PAYLINK_CONFIG.API_ID,
      hasSecretKey: !!PAYLINK_CONFIG.SECRET_KEY
    }
  };
}
