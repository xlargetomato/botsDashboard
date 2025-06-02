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
    // Validate required fields
    if (!invoiceData.amount) {
      throw new Error('Invoice amount is required');
    }
    
    if (!invoiceData.orderNumber) {
      throw new Error('Order number is required');
    }
    
    // Create a validated copy of the data
    const validatedData = { ...invoiceData };
    
    // Ensure amount is correctly formatted as a number with 2 decimal places
    // Paylink requires amount to be a number, not a string
    if (typeof validatedData.amount === 'string') {
      validatedData.amount = parseFloat(parseFloat(validatedData.amount).toFixed(2));
    } else {
      validatedData.amount = parseFloat(parseFloat(validatedData.amount).toFixed(2));
    }
    
    // Ensure currency is properly set - SAR is required for Saudi Arabian payments
    if (!validatedData.currency) {
      validatedData.currency = PAYLINK_CONFIG.CURRENCY || 'SAR';
    }
    
    // Ensure callback URLs are properly set
    if (!validatedData.callBackUrl) {
      validatedData.callBackUrl = PAYLINK_CONFIG.DEFAULT_CALLBACK_URL;
    }
    
    // Fix callback URL format if needed (remove any double slashes that aren't in protocol)
    if (validatedData.callBackUrl) {
      validatedData.callBackUrl = validatedData.callBackUrl.replace(/([^:])\/{2,}/g, '$1/');
    }
    
    // Ensure 3DS callback URLs are properly set - critical for completing payment
    if (!validatedData.threeDSCallBackUrl) {
      // Add 3DS callback URLs with transaction ID to validated data
      // This is CRITICAL: Use the dedicated 3DS return handler, not the general callback URL
      // The 3DS return handler is specifically designed to complete the 3D Secure authentication
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NGROK_URL || 'http://localhost:3000';
      validatedData.threeDSCallBackUrl = `${baseUrl}/api/paylink/3ds-return?orderNumber=${validatedData.orderNumber}&transactionNo=${validatedData.orderNumber}`;
    }
    
    // Format 3DS callback URL
    if (validatedData.threeDSCallBackUrl) {
      validatedData.threeDSCallBackUrl = validatedData.threeDSCallBackUrl.replace(/([^:])\/{2,}/g, '$1/');
    }
    
    // Ensure we have a return URL (used after 3DS auth)
    if (!validatedData.returnUrl) {
      validatedData.returnUrl = validatedData.callBackUrl || PAYLINK_CONFIG.DEFAULT_CALLBACK_URL;
    }
    
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
    let response;
    try {
      if (PAYLINK_CONFIG.DEBUG_MODE) {
        console.log(`Fetching invoice details using primary endpoint: ${PAYLINK_CONFIG.ENDPOINTS.GET_INVOICE}/${invoiceId}`);
      }
      
      // Try using GET_INVOICE endpoint first (should be more reliable)
      response = await paylinkRequest(`${PAYLINK_CONFIG.ENDPOINTS.GET_INVOICE}/${invoiceId}`);
    } catch (primaryEndpointError) {
      console.log(`Primary invoice endpoint failed: ${primaryEndpointError.message}. Trying fallback...`);
      
      try {
        // Fallback to the INVOICES endpoint
        if (PAYLINK_CONFIG.DEBUG_MODE) {
          console.log(`Trying fallback invoice endpoint: ${PAYLINK_CONFIG.ENDPOINTS.INVOICES}/${invoiceId}`);
        }
        response = await paylinkRequest(`${PAYLINK_CONFIG.ENDPOINTS.INVOICES}/${invoiceId}`);
      } catch (fallbackError) {
        console.error(`All invoice endpoints failed for ${invoiceId}:`, fallbackError);
        
        // Try the transaction lookup instead as last resort
        try {
          if (PAYLINK_CONFIG.DEBUG_MODE) {
            console.log(`Trying transaction lookup as last resort for ID: ${invoiceId}`);
          }
          // Use transaction endpoint as last resort
          const transResponse = await getTransactionByNumber(invoiceId);
          if (transResponse.success) {
            return transResponse;
          }
        } catch (transError) {
          console.error(`Transaction lookup also failed for ${invoiceId}:`, transError);
        }
        
        // If all methods fail, return a standardized error
        return { 
          success: false, 
          error: `Paylink API error (${fallbackError.status || 404}): ${fallbackError.message || 'Not Found'}`,
          data: { status: 'error', message: 'Payment verification failed' } 
        };
      }
    }
    
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
 * @param {object} params - Parameters for 3DS authentication
 * @param {string} params.PaRes - Payment Authentication Response
 * @param {string} params.MD - Merchant Data
 * @param {string} params.transactionNo - Transaction number
 * @returns {Promise<object>} Authentication result
 */
export async function complete3DSecureAuthentication(params) {
  try {
    // Validate input parameters
    if (!params) {
      throw new Error('Missing 3D Secure parameters');
    }
    
    if (!params.PaRes) {
      console.error('Missing required PaRes parameter for 3D Secure authentication');
      return {
        success: false,
        status: 'error',
        message: 'Missing required PaRes parameter for 3D Secure authentication',
        errorType: 'validation_error'
      };
    }
    
    if (!params.MD) {
      console.error('Missing required MD parameter for 3D Secure authentication');
      return {
        success: false,
        status: 'error',
        message: 'Missing required MD parameter for 3D Secure authentication',
        errorType: 'validation_error'
      };
    }
    
    // Extract transaction number from MD if not provided
    let transactionNo = params.transactionNo;
    if (!transactionNo && params.MD) {
      try {
        // Try URL decoding first
        const decodedMD = decodeURIComponent(params.MD);
        
        // Check if it looks like JSON
        if (decodedMD.startsWith('{') && decodedMD.endsWith('}')) {
          try {
            const mdObj = JSON.parse(decodedMD);
            transactionNo = mdObj.transactionNo || mdObj.orderNumber;
            console.log('Extracted transaction number from decoded JSON MD:', transactionNo);
          } catch (jsonError) {
            console.error('Failed to parse decoded MD as JSON:', jsonError.message);
            // Use the decoded value as-is
            transactionNo = decodedMD;
          }
        } else if (params.MD.includes('transactionNo') || params.MD.includes('orderNumber')) {
          // Try to parse raw MD as JSON
          try {
            const mdObj = JSON.parse(params.MD);
            transactionNo = mdObj.transactionNo || mdObj.orderNumber;
            console.log('Extracted transaction number from raw JSON MD:', transactionNo);
          } catch (jsonError) {
            console.error('Failed to parse raw MD as JSON despite containing keywords:', jsonError.message);
            // Just use the MD directly in this case
            transactionNo = params.MD;
          }
        } else {
          // MD might be the transaction number itself
          transactionNo = decodedMD;
          console.log('Using decoded MD as transaction number:', transactionNo);
        }
      } catch (decodeError) {
        // If decoding fails, use MD directly
        console.error('Failed to decode MD:', decodeError.message);
        transactionNo = params.MD;
        console.log('Using raw MD as transaction number:', transactionNo);
      }
    }
    
    console.log('Transaction number for 3DS completion:', transactionNo);
    
    try {
      // Use Paylink primary API to complete 3D secure authentication
      // Get a fresh auth token
      const token = await getAuthToken();
      
      // Prepare the payload according to Paylink specs
      // IMPORTANT: The correct parameter names are case-sensitive!
      // Must use exactly PaRes and MD (correct capitalization) as per Paylink docs
      const payload = {
        PaRes: params.PaRes,  // Correct capitalization is critical
        MD: params.MD,        // Correct capitalization is critical
        transactionNo: transactionNo
      };
      
      console.log('Complete 3DS payload keys:', Object.keys(payload).join(', '));
      
      // Make direct API call with proper headers and authentication
      const completeAuthUrl = `${PAYLINK_CONFIG.BASE_URL}${PAYLINK_CONFIG.ENDPOINTS.COMPLETE_AUTHENTICATION}`;
      console.log('Using 3DS completion URL:', completeAuthUrl);
      
      const response = await fetch(completeAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      // Check response status and parse accordingly
      console.log('Primary 3DS completion raw response status:', response.status);
      
      // Get the response text/json
      const responseText = await response.text();
      console.log('Primary 3DS completion raw response (truncated):', 
        responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      
      // Parse the response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed 3DS completion response:', responseData);
      } catch (parseError) {
        console.error('Failed to parse 3DS completion response as JSON:', parseError);
        responseData = { success: false, error: 'Invalid response format' };
      }
      
      // Normalize response data to a standard format regardless of Paylink's inconsistent responses
      const normalizedResponse = {
        success: responseData.success === true || 
                responseData.status === 'success' || 
                responseData.orderStatus === 'COMPLETED' || 
                (response.ok && !responseData.error),
        statusCode: responseData.statusCode || responseData.status_code || (response.ok ? 200 : response.status),
        message: responseData.msg || responseData.message || responseData.description || '',
        transactionNo: responseData.transactionNo || responseData.orderNumber || responseData.id || transactionNo,
        invoiceId: responseData.invoiceId || responseData.id || '',
        status: responseData.orderStatus || responseData.status || '',
        rawData: responseData
      };
      
      // If success, return the normalized response
      if (normalizedResponse.success) {
        console.log('Primary 3DS completion successful', normalizedResponse);
        return normalizedResponse;
      }
      
      // Handle error responses with better error messages
      console.log(`Payment error detected in 3DS completion. Status: ${normalizedResponse.statusCode}, Message: ${normalizedResponse.message || 'No message'}`);
      
      // Map specific error codes to user-friendly messages
      const numericStatusCode = parseInt(normalizedResponse.statusCode);
      const isKnownError = [412, 451, 452, 500].includes(numericStatusCode);
      
      console.log(`Handling 3DS error with status code ${numericStatusCode}, isKnownError: ${isKnownError}`);
      
      // Create structured error response with all necessary details
      // This will be used by the callback route to properly handle the error
      return {
        success: false,
        statusCode: numericStatusCode || 400,
        status: 'failed',
        message: normalizedResponse.message || 'Payment authentication failed',
        transactionNo: normalizedResponse.transactionNo,
        invoiceId: normalizedResponse.invoiceId,
        errorCode: numericStatusCode,
        errorType: numericStatusCode === 451 ? 'payment_declined' : 
                  numericStatusCode === 412 ? 'payment_system_error' : 
                  'payment_processing_error',
        rawData: responseData
      };
    } catch (primaryMethodError) {
      console.error('Error in primary 3DS completion method:', primaryMethodError);
      console.log('Trying alternative 3DS completion method...');
      
      try {
        // Important: For the alternative endpoint, we need to try both with and without authentication token
        // as Paylink's documentation is inconsistent about whether this endpoint requires authentication
        
        // First, prepare the payload - important to use URLSearchParams for x-www-form-urlencoded format
        const altPayload = new URLSearchParams({
          PaRes: params.PaRes, // Must be exactly PaRes (case sensitive)
          MD: params.MD, // Must be exactly MD (case sensitive)
          orderNumber: params.orderNumber || transactionNo,
          // These additional parameters may help with proper routing
          callBackUrl: PAYLINK_CONFIG.DEFAULT_CALLBACK_URL,
          threeDSCallBackUrl: PAYLINK_CONFIG.DEFAULT_3DS_CALLBACK_URL
        }).toString();
        
        console.log('Alternative 3DS endpoint:', `${PAYLINK_CONFIG.BASE_URL}${PAYLINK_CONFIG.ENDPOINTS.ALT_COMPLETE_AUTHENTICATION}`);
        console.log('Alternative 3DS payload keys:', [...new URLSearchParams(altPayload).keys()].join(', '));
        
        // Get authentication token (for first attempt with auth)
        const token = await getAuthToken();
        
        // First attempt with authentication
        const altResponse = await fetch(`${PAYLINK_CONFIG.BASE_URL}${PAYLINK_CONFIG.ENDPOINTS.ALT_COMPLETE_AUTHENTICATION}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          body: altPayload
        });
        
        console.log(`Alternative 3DS raw response status: ${altResponse.status}`);
        
        // Read the response body as text first to log it and examine it
        const altResponseText = await altResponse.text();
        console.log('Alternative 3DS response text (truncated):', 
          altResponseText.substring(0, 500) + (altResponseText.length > 500 ? '...' : ''));
        
        // Try to parse as JSON
        let altData;
        try {
          altData = JSON.parse(altResponseText);
          console.log('Parsed alternative 3DS response:', altData);
        } catch (parseError) {
          console.error('Failed to parse alternative 3DS response as JSON:', parseError);
          // If we couldn't parse as JSON but got a 200 OK, it might be a redirect URL in plain text
          // or another non-JSON success indicator
          if (altResponse.ok) {
            console.log('Alternative 3DS completion appears successful despite non-JSON response');
            return {
              success: true,
              status: 'success',
              message: 'Authentication completed (non-JSON response)',
              transactionNo: transactionNo,
              rawResponse: altResponseText
            };
          } else {
            console.error('Alternative 3DS completion failed with non-JSON error response');
            altData = { success: false, error: 'Invalid response format' };
          }
        }
        
        // Check if the alternative method succeeded
        if (altData && (altData.success || altData.status === 'success')) {
          console.log('Alternative 3DS completion succeeded');
          return {
            success: true,
            statusCode: 200,
            status: 'success',
            message: altData.message || 'Authentication completed successfully',
            transactionNo: altData.transactionNo || altData.orderNumber || transactionNo,
            invoiceId: altData.invoiceId || altData.id || '',
            rawData: altData
          };
        }
        
        // If we reach here, both methods failed
        console.error('Both primary and alternative 3DS completion methods failed');
        
        // Before giving up, try one more approach - just query transaction status directly
        if (transactionNo) {
          try {
            console.log('Trying final fallback: checking transaction status directly');
            const transactionStatus = await getTransactionByNumber(transactionNo);
            
            console.log('Final fallback transaction status check result:', {
              success: transactionStatus?.success,
              status: transactionStatus?.status,
              message: transactionStatus?.message,
              statusCode: transactionStatus?.statusCode
            });
            
            // If we get a successful status from transaction check, consider the 3DS auth successful
            if (transactionStatus.status === 'paid' || 
                transactionStatus.status === 'completed') {
              return {
                success: true,
                status: 'success',
                message: 'Transaction completed successfully (verified by status check)',
                transactionNo: transactionNo,
                rawData: transactionStatus
              };
            }
            
            // Return the transaction status error information
            return {
              success: false,
              statusCode: transactionStatus.statusCode || 400,
              status: transactionStatus.status || 'failed',
              message: transactionStatus.message || 'Payment verification failed',
              transactionNo: transactionNo,
              errorType: 'payment_verification_failed',
              rawData: transactionStatus
            };
          } catch (statusCheckError) {
            console.error('Error in final transaction status check:', statusCheckError);
          }
        }
        
        // All attempts failed, return structured error
        return {
          success: false,
          statusCode: altData?.statusCode || (altResponse?.status || 400),
          status: 'failed',
          message: altData?.message || altData?.msg || 'Failed to complete 3DS authentication after multiple attempts',
          transactionNo: transactionNo,
          errorType: 'authentication_failed',
          rawData: altData
        };
      } catch (alternativeMethodError) {
        console.error('Error in alternative 3DS completion method:', alternativeMethodError);
        
        // Check transaction status directly as last resort
        if (transactionNo) {
          try {
            const transactionStatus = await getTransactionByNumber(transactionNo);
            if (transactionStatus.status === 'paid' || transactionStatus.status === 'completed') {
              return {
                success: true,
                status: 'success',
                message: 'Transaction completed successfully (verified by status check)',
                transactionNo: transactionNo,
                rawData: transactionStatus
              };
            }
            
            return {
              success: false,
              statusCode: transactionStatus.statusCode || 500,
              message: transactionStatus.message || alternativeMethodError.message,
              transactionNo: transactionNo,
              errorType: 'payment_processing_error',
              rawData: transactionStatus
            };
          } catch (finalCheckError) {
            console.error('Final transaction check failed:', finalCheckError);
          }
        }
        
        // Return error after all attempts failed
        return {
          success: false,
          status: 'error',
          message: `Failed to complete 3DS authentication: ${alternativeMethodError.message}`,
          transactionNo: transactionNo,
          errorType: 'system_error',
          error: alternativeMethodError
        };
      }
    }
  } catch (error) {
    // Final fallback for any unhandled errors
    console.error('CRITICAL ERROR in 3D Secure authentication:', error);
    return {
      success: false,
      status: 'error',
      message: error.message || 'Unknown error in 3DS authentication',
      transactionNo: params.transactionNo || params.orderNumber,
      errorType: 'system_error',
      error: error
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
