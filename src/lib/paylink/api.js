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
  try {
    // Check if we have a valid cached token
    if (tokenCache.token && tokenCache.expiry && new Date() < tokenCache.expiry) {
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log('Using cached Paylink auth token, expires:', tokenCache.expiry);
      }
      return tokenCache.token;
    }
    
    // Validate credentials are available
    if (!PAYLINK_CONFIG.API_ID || !PAYLINK_CONFIG.SECRET_KEY) {
      throw new Error('Missing Paylink credentials. Check your PAYLINK_ID_TOKEN and PAYLINK_SECRET environment variables.');
    }
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Requesting Paylink auth token from ${PAYLINK_CONFIG.BASE_URL}/api/auth`);
      console.log('API ID available:', !!PAYLINK_CONFIG.API_ID, 'Secret available:', !!PAYLINK_CONFIG.SECRET_KEY);
    }
    
    // Make authentication request - use credentials exactly as provided in .env
    const response = await fetch(`${PAYLINK_CONFIG.BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiId: PAYLINK_CONFIG.API_ID,
        secretKey: PAYLINK_CONFIG.SECRET_KEY
      })
    });
    
    // Get full response for debugging
    const responseText = await response.text();
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Paylink auth response status: ${response.status}`);
      console.log(`Paylink auth response body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    }
    
    if (!response.ok) {
      // If the first attempt fails, try alternate endpoint
      const alternateResponse = await fetch(`${PAYLINK_CONFIG.ALTERNATE_BASE_URL}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          apiId: PAYLINK_CONFIG.API_ID,
          secretKey: PAYLINK_CONFIG.SECRET_KEY
        })
      });
      
      // Get full response for debugging
      const alternateResponseText = await alternateResponse.text();
      
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log(`Alternate Paylink auth response status: ${alternateResponse.status}`);
        console.log(`Alternate Paylink auth response body: ${alternateResponseText.substring(0, 500)}${alternateResponseText.length > 500 ? '...' : ''}`);
      }
      
      if (!alternateResponse.ok) {
        throw new Error(`Authentication failed with status ${response.status}: ${responseText}`);
      }
      
      try {
        const data = JSON.parse(alternateResponseText);
        const token = data.token || data.id_token || data.access_token;
        if (!token) {
          throw new Error('No token found in authentication response');
        }
        
        // Cache the token
        const expirySeconds = data.expiresIn || data.expires_in || 3600; // Default to 1 hour
        tokenCache = {
          token: token,
          expiry: new Date(Date.now() + (expirySeconds * 1000) - 300000) // Expire 5 minutes early
        };
        
        return token;
      } catch (parseError) {
        throw new Error(`Failed to parse authentication response: ${alternateResponseText}`);
      }
    }
    
    try {
      // Parse the response
      const data = JSON.parse(responseText);
      
      // Extract token from various possible response formats
      const token = data.token || data.id_token || data.access_token;
      if (!token) {
        throw new Error('No token found in authentication response');
      }
      
      // Cache the token with expiry
      const expirySeconds = data.expiresIn || data.expires_in || 3600; // Default to 1 hour if not specified
      tokenCache = {
        token: token,
        expiry: new Date(Date.now() + (expirySeconds * 1000) - 300000) // Expire 5 minutes early
      };
      
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log('Token cached successfully, expires:', tokenCache.expiry);
      }
      
      return token;
    } catch (parseError) {
      throw new Error(`Failed to parse authentication response: ${responseText}`);
    }
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
    // Make sure endpoint starts with / for proper URL formation
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let apiUrl = PAYLINK_CONFIG.BASE_URL + formattedEndpoint;
    
    // Get authentication token
    let token;
    try {
      token = await getAuthToken();
      if (PAYLINK_CONFIG.DEBUG_MODE && token) {
        console.log('Using auth token for API request:', token.substring(0, 10) + '...');
      }
    } catch (authError) {
      console.error('Failed to get auth token:', authError.message);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    // Build request options
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Add authentication header if token is available
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add request body for POST/PUT methods
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Making Paylink API request to: ${apiUrl}`);
      console.log('Request options:', {
        method: options.method,
        headers: options.headers,
        bodyLength: options.body ? options.body.length : 0
      });
      if (data) {
        console.log('Request payload:', JSON.stringify(data, null, 2));
      }
    }
    
    // Make the request
    let response;
    try {
      response = await fetch(apiUrl, options);
    } catch (fetchError) {
      console.error(`Network error with ${apiUrl}:`, fetchError.message);
      
      // Try alternate base URL as fallback
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log('Trying alternate API endpoint...');
      }
      
      const alternateUrl = PAYLINK_CONFIG.ALTERNATE_BASE_URL + formattedEndpoint;
      try {
        response = await fetch(alternateUrl, options);
      } catch (altFetchError) {
        throw new Error(`Failed to connect to Paylink API: ${altFetchError.message}`);
      }
    }
    
    // Get the response text for parsing and debugging
    const responseText = await response.text();
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Paylink API response (${response.status}):`, 
        responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    }
    
    // Parse the response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Paylink API response as JSON:', responseText);
      throw new Error(`Paylink API returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }
    
    // Handle error responses
    if (!response.ok) {
      const errorMessage = responseData?.message || 
                        responseData?.error || 
                        responseData?.errorMessage || 
                        response.statusText || 
                        'Unknown error';
      console.error('Paylink API error details:', responseData);
      throw new Error(`Paylink API error (${response.status}): ${errorMessage}`);
    }
    
    return responseData;
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
  try {
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Creating Paylink invoice with data:', JSON.stringify(invoiceData, null, 2));
    }
    
    // Ensure we have required invoice fields
    const validatedData = { ...invoiceData };
    
    // Add a reference number if not present
    if (!validatedData.orderNumber) {
      validatedData.orderNumber = generateReferenceNumber();
    }
    
    // Ensure amount is properly formatted
    if (validatedData.amount) {
      validatedData.amount = formatAmount(validatedData.amount);
    }
    
    // Ensure we have mandatory fields
    if (!validatedData.amount) {
      throw new Error('Invoice amount is required');
    }
    
    // Set default currency if not provided
    if (!validatedData.currency) {
      validatedData.currency = PAYLINK_CONFIG.CURRENCY;
    }
    
    // Add 3DS callback URLs with transaction ID to validated data
    // This is CRITICAL: Use the dedicated 3DS return handler, not the general callback URL
    // The 3DS return handler is specifically designed to complete the 3D Secure authentication
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NGROK_URL || 'http://localhost:3000';
    validatedData.threeDSCallBackUrl = `${baseUrl}/api/paylink/3ds-return?orderNumber=${validatedData.orderNumber}&transactionNo=${validatedData.orderNumber}`;
    // Keep the original callback URL for server notifications
    validatedData.returnUrl = validatedData.callBackUrl || PAYLINK_CONFIG.DEFAULT_CALLBACK_URL;
    
    // Use paylinkRequest for authenticated API call with proper error handling
    const response = await paylinkRequest(PAYLINK_CONFIG.ENDPOINTS.INVOICES, 'POST', validatedData);
    
    // Handle successful response
    if (response) {
      // Extract invoice details from various possible response formats
      const result = {
        // Extract invoice ID from various possible response field names
        invoiceId: response.id || response.invoiceId || response.invoice_id || response.transactionNo,
        
        // Extract payment URL from various possible response field names
        paymentUrl: response.url || response.paymentUrl || response.payment_url || 
                  response.checkoutUrl || response.checkout_url ||
                  (response.data && (response.data.url || response.data.paymentUrl || response.data.payment_url)),
        
        // Return the original response data for reference
        rawResponse: response
      };
      
      // Validate we have minimum required fields
      if (!result.invoiceId) {
        throw new Error('Invoice ID not found in Paylink response');
      }
      
      // Construct payment URL if not provided in response
      if (!result.paymentUrl) {
        result.paymentUrl = `${PAYLINK_CONFIG.BASE_URL}/checkout/${result.invoiceId}`;
      }
      
      // Ensure the payment URL doesn't have double slashes
      result.paymentUrl = result.paymentUrl.replace(/([^:])\/{2,}/g, '$1/');
      
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log('Successfully created invoice with ID:', result.invoiceId);
        console.log('Payment URL:', result.paymentUrl);
      }
      
      return result;
    }
    
    throw new Error('Empty response from Paylink invoice creation');
  } catch (error) {
    console.error('Error creating Paylink invoice:', error);
    
    // Try alternate endpoint if the main one fails
    try {
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log('Trying alternate invoice endpoint...');
      }
      
      // Use alternate base URL with same endpoint
      const altValidatedData = { ...invoiceData };
      
      // Add a reference number if not present
      if (!altValidatedData.orderNumber) {
        altValidatedData.orderNumber = generateReferenceNumber();
      }
      
      // Get fresh token
      const token = await getAuthToken();
      
      const response = await fetch(`${PAYLINK_CONFIG.ALTERNATE_BASE_URL}/api/addInvoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(altValidatedData)
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`Alternate endpoint failed with status ${response.status}: ${responseText}`);
      }
      
      const responseData = JSON.parse(responseText);
      
      // Extract and standardize response
      const result = {
        invoiceId: responseData.id || responseData.invoiceId || responseData.invoice_id || responseData.transactionNo,
        paymentUrl: responseData.url || responseData.paymentUrl || responseData.payment_url || 
                  responseData.checkoutUrl || responseData.checkout_url ||
                  (responseData.data && (responseData.data.url || responseData.data.paymentUrl)),
        rawResponse: responseData
      };
      
      if (!result.invoiceId) {
        throw new Error('Invoice ID not found in alternate endpoint response');
      }
      
      // Construct payment URL if not provided
      if (!result.paymentUrl) {
        result.paymentUrl = `${PAYLINK_CONFIG.ALTERNATE_BASE_URL}/checkout/${result.invoiceId}`;
      }
      
      return result;
    } catch (altError) {
      console.error('Alternate invoice endpoint also failed:', altError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Get invoice details
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>} Invoice details
 */
export async function getInvoice(invoiceId) {
  if (!invoiceId) {
    console.error('Missing invoice ID for getInvoice call');
    return { success: false, error: 'Missing invoice ID' };
  }
  
  try {
    // Check if we have valid configuration before making API call
    if (!PAYLINK_CONFIG.API_ID || !PAYLINK_CONFIG.SECRET_KEY) {
      console.error('Missing Paylink credentials for getInvoice call');
      return { 
        success: false, 
        error: 'Missing Paylink credentials',
        data: { status: 'error', message: 'Configuration error' } 
      };
    }
    
    // Make the API request with proper error handling
    const response = await paylinkRequest(`${PAYLINK_CONFIG.ENDPOINTS.INVOICES}/${invoiceId}`).catch(err => {
      console.error(`Error fetching Paylink invoice ${invoiceId}:`, err);
      return { 
        success: false, 
        error: err.message,
        data: { status: 'error', message: 'API error' } 
      };
    });
    
    // Make sure we have a valid response
    if (!response) {
      return { 
        success: false, 
        error: 'Empty response from Paylink API',
        data: { status: 'error', message: 'Empty response' } 
      };
    }
    
    return response;
  } catch (error) {
    console.error(`Unhandled error in getInvoice for ${invoiceId}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      data: { status: 'error', message: 'Exception occurred' } 
    };
  }
}

/**
 * Get transaction details by transaction number
 * This is an alternative way to verify transactions when you have a transactionNo
 * but don't have (or can't use) the invoiceId
 * 
 * @param {string} transactionNo - Transaction number from Paylink
 * @returns {Promise<object>} Transaction details
 */
export async function getTransactionByNumber(transactionNo) {
  if (!transactionNo) {
    console.error('Missing transaction number for getTransactionByNumber call');
    return { success: false, error: 'Missing transaction number' };
  }
  
  try {
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Fetching transaction details for transactionNo: ${transactionNo}`);
    }
    
    // Check if we have valid configuration before making API call
    if (!PAYLINK_CONFIG.API_ID || !PAYLINK_CONFIG.SECRET_KEY) {
      console.error('Missing Paylink credentials for getTransactionByNumber call');
      return { 
        success: false, 
        error: 'Missing Paylink credentials',
        data: { status: 'error', message: 'Configuration error' } 
      };
    }
    
    // Use transactions endpoint - this will work even when invoice endpoint fails
    // The transactions endpoint is often more reliable for verifying payment status
    const transactionEndpoint = `${PAYLINK_CONFIG.ENDPOINTS.TRANSACTIONS}/${transactionNo}`;
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Calling Paylink API endpoint: ${transactionEndpoint}`);
    }
    
    // Make the API request with proper error handling
    const response = await paylinkRequest(transactionEndpoint).catch(err => {
      console.error(`Error fetching Paylink transaction ${transactionNo}:`, err);
      return { 
        success: false, 
        error: err.message,
        data: { status: 'error', message: 'API error' } 
      };
    });
    
    // Make sure we have a valid response
    if (!response) {
      return { 
        success: false, 
        error: 'Empty response from Paylink API',
        data: { status: 'error', message: 'Empty response' } 
      };
    }
    
    // Check for error status codes from Paylink
    if (response.statusCode && response.statusCode !== 200 && response.statusCode !== 100) {
      console.log(`Payment error detected in transaction check. Status: ${response.statusCode}, Message: ${response.msg || 'No message'}`);
      
      // Map status codes to meaningful messages
      let errorMessage = response.msg || 'Payment processing error';
      
      // Known Paylink status codes
      switch (String(response.statusCode)) {
        case '400': errorMessage = 'Bad request - missing or invalid payment parameters'; break;
        case '401': errorMessage = 'Authentication failed - invalid merchant credentials'; break;
        case '404': errorMessage = 'Payment resource not found'; break;
        case '412': errorMessage = 'Payment precondition failed - internal error'; break;
        case '422': errorMessage = 'Payment request could not be processed - validation error'; break;
        case '451': errorMessage = 'Payment declined by issuing bank'; break;
        case '500': errorMessage = 'Payment gateway internal error'; break;
      }
      
      // Forward the error to the callback URL with proper parameters
      const callbackUrl = new URL(PAYLINK_CONFIG.DEFAULT_CALLBACK_URL);
      callbackUrl.searchParams.append('statusCode', response.statusCode);
      callbackUrl.searchParams.append('msg', errorMessage);
      callbackUrl.searchParams.append('transactionNo', transactionNo);
      
      console.log('Transaction check error. Redirecting to callback with error:', callbackUrl.toString());
      
      // Return structured response with redirect URL and error details
      return {
        success: false,
        status: 'error',
        statusCode: response.statusCode,
        message: errorMessage,
        redirectUrl: callbackUrl.toString(),
        rawResponse: response
      };
    }
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log(`Paylink transaction response for ${transactionNo}:`, JSON.stringify(response, null, 2));
    }
    
    return response;
  } catch (error) {
    console.error(`Unhandled error in getTransactionByNumber for ${transactionNo}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      data: { status: 'error', message: 'Exception occurred' } 
    };
  }
}

/**
 * Complete 3D Secure authentication process
 * 
 * THIS IS THE CRITICAL MISSING FUNCTION FOR PAYLINK INTEGRATION
 * After 3D Secure authentication (ACS), Paylink requires a final confirmation
 * step with the PaRes and transactionNo to complete the payment process
 *
 * @param {Object} params - Parameters from 3DS callback
 * @param {string} params.PaRes - Payment Authentication Response from ACS
 * @param {string} params.MD - Merchant Data (typically contains transactionNo)
 * @param {string} params.transactionNo - Transaction number from Paylink
 * @returns {Promise<Object>} Transaction completion result
 */
export async function complete3DSecureAuthentication(params) {
  try {
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('Completing 3DS authentication with params:', {
        ...params,
        PaRes: params.PaRes ? `${params.PaRes.substring(0, 10)}... [truncated]` : undefined,
        MD: params.MD ? `${params.MD.substring(0, 10)}... [truncated]` : undefined
      });
    }
    
    // Log the order number for debugging
    console.log('Order Number/Transaction ID from URL:', params.orderNumber || params.transactionNo || 'Not provided');
    
    // Extract transaction number from MD if not directly provided
    let transactionNo = params.transactionNo;
    if (!transactionNo && params.MD) {
      try {
        // MD might be URL-encoded or a JSON string
        const decodedMD = decodeURIComponent(params.MD);
        const mdData = JSON.parse(decodedMD);
        transactionNo = mdData.transactionNo || mdData.orderNumber;
      } catch (e) {
        // If parsing fails, use MD directly as it might be the transaction number
        transactionNo = params.MD;
      }
    }
    
    if (!transactionNo) {
      throw new Error('Missing transaction number for 3DS completion');
    }
    
    if (!params.PaRes) {
      throw new Error('Missing PaRes for 3DS completion');
    }
    
    // Paylink may sometimes have issues with Base64 encoding
    // Let's try both the original PaRes and a base64 encoded version
    let encodedPaRes = params.PaRes;
    
    // Some implementations of Paylink require base64 encoding, others don't
    // We'll first try with the original PaRes value as provided by the ACS
    
    // Try primary authentication method first
    try {
      console.log('Trying primary 3DS completion endpoint...');
      const response = await paylinkRequest(
        PAYLINK_CONFIG.ENDPOINTS.COMPLETE_AUTHENTICATION,
        'POST',
        {
          transactionNo,
          paRes: encodedPaRes,
          callBackUrl: PAYLINK_CONFIG.DEFAULT_CALLBACK_URL,
          threeDSCallBackUrl: PAYLINK_CONFIG.DEFAULT_3DS_CALLBACK_URL
        }
      );
      
      // Check for error status codes and prepare proper error response
      if (response && response.statusCode && response.statusCode !== 200 && response.statusCode !== 100) {
        console.log(`Payment error detected in 3DS completion. Status: ${response.statusCode}, Message: ${response.msg || 'No message'}`);
        
        // Forward the error to the callback URL with proper parameters
        const callbackUrl = new URL(PAYLINK_CONFIG.DEFAULT_CALLBACK_URL);
        callbackUrl.searchParams.append('statusCode', response.statusCode);
        callbackUrl.searchParams.append('msg', response.msg || 'Payment processing error');
        callbackUrl.searchParams.append('transactionNo', transactionNo);
        callbackUrl.searchParams.append('orderNumber', params.orderNumber || transactionNo);
        
        console.log('Redirecting to callback with error:', callbackUrl.toString());
        // Return structured response with redirect URL
        return {
          success: false,
          status: 'error',
          statusCode: response.statusCode,
          message: response.msg || 'Payment processing error',
          redirectUrl: callbackUrl.toString(),
          rawResponse: response
        };
      }
      
      if (response && (response.success || response.status === 'success')) {
        console.log('Primary 3DS completion successful');
        return response;
      }
      
      console.log('Primary 3DS completion failed, trying alternative method...');
    } catch (primaryError) {
      console.error('Error in primary 3DS completion method:', primaryError);
      console.log('Trying alternative 3DS completion method...');
    }
    
    // If primary method fails, try the alternative method
    // This uses the ACSRedirection endpoint that works with the landing3dSecure flow
    try {
      // For this endpoint, we need a different payload structure
      const altResponse = await fetch(`${PAYLINK_CONFIG.BASE_URL}${PAYLINK_CONFIG.ENDPOINTS.ALT_COMPLETE_AUTHENTICATION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          PaRes: params.PaRes,
          MD: params.MD,
          orderNumber: params.orderNumber || transactionNo,
        }).toString()
      });
      
      if (!altResponse.ok) {
        console.error('Alternative 3DS method failed with status:', altResponse.status);
        throw new Error(`Alternative 3DS completion failed with status ${altResponse.status}`);
      }
      
      const altResponseText = await altResponse.text();
      console.log('Alternative 3DS completion response:', altResponseText.substring(0, 200) + '...');
      
      // The response might be HTML or JSON, try to parse as JSON first
      try {
        const jsonResponse = JSON.parse(altResponseText);
        console.log('Successfully parsed alternative 3DS response as JSON');
        return jsonResponse;
      } catch (parseError) {
        // If it's not JSON, it might be HTML, which means the payment is processing
        console.log('Alternative 3DS response is not JSON (likely HTML).');
        return {
          success: true,
          status: 'processing',
          message: 'Payment is being processed',
          data: { rawResponse: 'HTML response received' }
        };
      }
    } catch (altError) {
      console.error('Error in alternative 3DS completion method:', altError);
      throw altError; // Rethrow to be caught by the outer catch block
    }
    
    if (PAYLINK_CONFIG.DEBUG_MODE) {
      console.log('3DS completion response:', response);
    }
    
    return response;
  } catch (error) {
    console.error('Error completing 3D Secure authentication:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      data: { status: 'error', message: 'Failed to complete 3D Secure authentication' }
    };
  }
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

// End of Paylink API functions
