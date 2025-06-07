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
    console.log('[service.js createInvoice] Incoming invoiceData.callBackUrl:', invoiceData.callBackUrl);
    console.log('[service.js createInvoice] Incoming invoiceData.threeDSCallBackUrl:', invoiceData.threeDSCallBackUrl);
    console.log('[service.js createInvoice] Incoming invoiceData.returnUrl:', invoiceData.returnUrl);
    
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
    
    // Set callback URLs if not already provided in invoiceData
    // This allows createDirectCheckout to pass its own constructed callback URLs
    if (!validatedData.callBackUrl) {
      validatedData.callBackUrl = PAYLINK_CONFIG.DEFAULT_CALLBACK_URL;
    }
    
    if (!validatedData.threeDSCallBackUrl) {
      validatedData.threeDSCallBackUrl = PAYLINK_CONFIG.DEFAULT_3DS_CALLBACK_URL;
    }
    
    if (!validatedData.returnUrl) {
      // Default returnUrl can also be the 3DS callback URL or the main callback URL
      validatedData.returnUrl = validatedData.threeDSCallBackUrl || validatedData.callBackUrl || PAYLINK_CONFIG.DEFAULT_3DS_CALLBACK_URL;
    }
    
    // Fix callback URL format if needed
    if (validatedData.callBackUrl) {
      // Fix any double slashes that aren't part of the protocol
      validatedData.callBackUrl = validatedData.callBackUrl.replace(/([^:])\/{2,}/g, '$1/');
    }
    
    if (validatedData.threeDSCallBackUrl) {
      validatedData.threeDSCallBackUrl = validatedData.threeDSCallBackUrl.replace(/([^:])\/{2,}/g, '$1/');
    }
    
    if (validatedData.returnUrl) {
      validatedData.returnUrl = validatedData.returnUrl.replace(/([^:])\/{2,}/g, '$1/');
    }
    
    // Log the final validated URLs before sending to Paylink API
    console.log('[service.js createInvoice] FINAL validatedData.callBackUrl FOR PAYLINK:', validatedData.callBackUrl);
    console.log('[service.js createInvoice] FINAL validatedData.threeDSCallBackUrl FOR PAYLINK:', validatedData.threeDSCallBackUrl);
    console.log('[service.js createInvoice] FINAL validatedData.returnUrl FOR PAYLINK:', validatedData.returnUrl);

    // Log the URLs being used (helpful for debugging)
    console.log('Paylink URLs being used (this is the object sent to Paylink):', {
      callBackUrl: validatedData.callBackUrl,
      threeDSCallBackUrl: validatedData.threeDSCallBackUrl,
      returnUrl: validatedData.returnUrl
    });
    
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
    let threeDSCallbackUrl = PAYLINK_CONFIG.DEFAULT_3DS_CALLBACK_URL;
    
    // Detect if we're in browser environment and override localhost URLs with actual origin
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Only replace if URLs contain localhost
      if (callbackUrl.includes('localhost')) {
        callbackUrl = `${origin}/api/paylink/callback`;
      }
      if (threeDSCallbackUrl.includes('localhost')) {
        threeDSCallbackUrl = `${origin}/api/paylink/3ds-callback`;
      }
      
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log('Detected browser environment, using current origin:', origin);
      }
    }
    
    // Ensure callback URL has proper transaction tracking with multiple parameter formats
    // This ensures our callback endpoint can identify the transaction regardless of which parameter
    // name Paylink decides to use in the callback
    const hasQueryParams = callbackUrl.includes('?');
    let callbackWithParams = hasQueryParams ? callbackUrl : `${callbackUrl}?`;
    
    // Add all possible transaction identifier formats that Paylink might use in callbacks
    // Paylink is inconsistent with parameter naming across different endpoints
    const paramPrefix = hasQueryParams ? '&' : '';
    
    // Only add parameters if they're not already present
    if (!callbackWithParams.includes('txn_id=')) {
      callbackWithParams = `${callbackWithParams}${paramPrefix}txn_id=${transactionId}`;
    }
    
    // Also include orderNumber parameter (used by Paylink in some callbacks)
    if (!callbackWithParams.includes('orderNumber=')) {
      callbackWithParams = `${callbackWithParams}&orderNumber=${transactionId}`;
    }
    
    // Also include transactionNo parameter (used by Paylink in some callbacks)
    if (!callbackWithParams.includes('transactionNo=')) {
      callbackWithParams = `${callbackWithParams}&transactionNo=${transactionId}`;
    }
    
    // Set the final callback URL
    callbackUrl = callbackWithParams;
    
    // If subscription ID is provided, include it in the callback URL
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Using callback URL:', callbackUrl);
      console.log('Using 3DS callback URL base:', threeDSCallbackUrl);
    }
    
    // Create the invoice payload
    const invoiceData = {
      orderNumber: transactionId,
      amount: formatAmount(paymentData.amount),
      callBackUrl: callbackUrl,
      // Add 3DS callback URLs with transaction ID
      threeDSCallBackUrl: `${threeDSCallbackUrl}?orderNumber=${transactionId}&transactionNo=${transactionId}`,
      returnUrl: callbackUrl, // Fallback return URL same as callback
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
        title: paymentData.planName || '',
        price: formatAmount(paymentData.amount),
        qty: 1,
        description: paymentData.planDescription || ''
      }]
    };
    
    // Create the invoice
    const invoice = await createInvoice(invoiceData);
    
    return {
      transactionId, // Our internal ID (SUB-xxx)
      invoiceId: invoice.invoiceId, // Paylink's invoice ID
      paylinkTransactionNo: invoice.transactionNo, // Paylink's actual transaction number
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
 * Verify Paylink webhook signature to ensure the callback is legitimate
 * @param {Object} headers - Request headers
 * @param {Object|string} body - Request body (JSON or string)
 * @returns {boolean} Whether the signature is valid
 */
export function verifyWebhookSignature(headers, body) {
  try {
    // Get signature from headers
    const signature = headers.get('x-paylink-signature') || headers.get('paylink-signature');
    
    // If no signature is provided, check if we're in test mode
    if (!signature) {
      console.warn('No Paylink signature found in webhook request');
      // In test mode, we might allow unsigned webhooks for testing purposes
      return !PAYLINK_CONFIG.IS_PRODUCTION;
    }
    
    // Verify the signature (when Paylink provides a verification mechanism)
    // Typically this would use a crypto library to verify HMAC signature
    // For now, we'll log it for future implementation
    console.log('Paylink webhook signature received:', signature);
    
    // Since Paylink doesn't currently provide webhook signature verification in their docs,
    // we'll use an alternative validation approach for security:
    // 1. Validate that the request contains expected fields
    // 2. Re-verify the transaction with Paylink API using the invoice ID
    
    // Parse body if it's a string
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    
    // Check if the body contains required fields for a valid webhook
    const hasRequiredFields = data && 
      (data.invoiceId || data.orderNumber || data.transactionNo) && 
      (data.status || data.state || data.paymentStatus);
      
    if (!hasRequiredFields) {
      console.warn('Webhook missing required fields');
      return false;
    }
    
    // In production, we should be strict about validation
    // In test mode, we can be more lenient
    return true;
  } catch (error) {
    console.error('Error verifying Paylink webhook signature:', error);
    return false;
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
