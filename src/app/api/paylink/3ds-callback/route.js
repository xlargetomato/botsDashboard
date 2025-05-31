import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { complete3DSecureAuthentication, getInvoice } from '@/lib/paylink/api';
import PAYLINK_CONFIG from '@/lib/paylink/config';

/**
 * 3D Secure Authentication Callback Handler
 * 
 * This critical endpoint handles the return from the 3D Secure ACS Emulator.
 * It receives the PaRes and MD values and completes the payment flow.
 */
// Helper function to get the base URL for redirects
function getBaseUrl(request) {
  let baseUrl = '';
  
  // Check if this is coming from an NGROK URL
  const requestUrl = request.url || '';
  const host = request.headers.get('host') || '';
  
  if (process.env.NGROK_URL) {
    baseUrl = process.env.NGROK_URL;
    console.log('Using NGROK URL for redirect:', baseUrl);
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    console.log('Using APP_URL for redirect:', baseUrl);
  } else if (requestUrl.includes('ngrok')) {
    // Extract ngrok URL from request
    const ngrokMatch = requestUrl.match(/(https?:\/\/[\w-]+\.ngrok-free\.app)/);
    if (ngrokMatch && ngrokMatch[1]) {
      baseUrl = ngrokMatch[1];
      console.log('Extracted NGROK URL for redirect:', baseUrl);
    }
  } else if (host && !host.includes('localhost')) {
    // Use the request host if it's not localhost
    const protocol = requestUrl.startsWith('https') ? 'https' : 'http';
    baseUrl = `${protocol}://${host}`;
    console.log('Using request host for redirect:', baseUrl);
  }
  
  return baseUrl;
}

export async function POST(request) {
  try {
    // Log the incoming request for debugging
    console.log('Received 3DS callback request');
    
    // Get PaRes and MD from POST body
    let callbackData;
    
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        callbackData = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        callbackData = Object.fromEntries(formData);
      } else {
        // Try to handle raw text body
        const text = await request.text();
        
        // Check if it's URL-encoded
        if (text.includes('=') && text.includes('&')) {
          const params = new URLSearchParams(text);
          callbackData = Object.fromEntries(params);
        } else {
          // Try to parse as JSON
          try {
            callbackData = JSON.parse(text);
          } catch (e) {
            // Last resort, parse manually
            const pairs = text.split('&');
            callbackData = {};
            for (const pair of pairs) {
              const [key, value] = pair.split('=');
              if (key && value) {
                callbackData[key] = decodeURIComponent(value.replace(/\+/g, ' '));
              }
            }
          }
        }
      }
    } catch (bodyError) {
      console.error('Error parsing 3DS callback body:', bodyError);
      return NextResponse.json(
        { error: 'Could not parse request body', details: bodyError.message },
        { status: 400 }
      );
    }

    console.log('3DS callback data (sanitized):', {
      ...callbackData,
      PaRes: callbackData.PaRes ? '[TRUNCATED]' : undefined,
      MD: callbackData.MD || undefined,
      transactionNo: callbackData.transactionNo || undefined
    });

    // Validate required parameters
    if (!callbackData.PaRes) {
      return NextResponse.json(
        { error: 'Missing required PaRes parameter' },
        { status: 400 }
      );
    }

    if (!callbackData.MD) {
      return NextResponse.json(
        { error: 'Missing required MD parameter' },
        { status: 400 }
      );
    }

    // Check if PaRes needs to be decoded from Base64
    let paRes = callbackData.PaRes;
    try {
      // If PaRes looks like a Base64 string, decode it
      if (paRes && /^[A-Za-z0-9+/=]+$/.test(paRes)) {
        const decoded = Buffer.from(paRes, 'base64').toString();
        if (decoded) paRes = decoded;
      }
    } catch (e) {
      console.warn('Error decoding PaRes, using as-is:', e);
    }
    
    // Extract transaction number from URL or query parameters
    let transactionNo = callbackData.transactionNo || callbackData.orderNumber;
    
    // If not found directly, try to extract from MD parameter
    if (!transactionNo && callbackData.MD) {
      try {
        if (callbackData.MD.includes('transactionNo')) {
          // Try to parse MD as JSON
          const mdObj = JSON.parse(callbackData.MD);
          transactionNo = mdObj.transactionNo || mdObj.orderNumber;
        } else {
          // MD might be the transaction number itself
          transactionNo = callbackData.MD;
        }
      } catch (e) {
        // If parsing fails, use MD directly
        transactionNo = callbackData.MD;
      }
    }
    
    // If still not found, check URL path for transaction number
    if (!transactionNo) {
      // Extract from URL path if present (e.g., /callback?orderNumber=SUB-12345)
      const url = request.url;
      const matches = url.match(/orderNumber=([\w-]+)/i) || url.match(/transactionNo=([\w-]+)/i);
      if (matches && matches[1]) {
        transactionNo = matches[1];
      }
    }
    
    console.log('Using transaction number for 3DS completion:', transactionNo);
    
    // Get transaction number from orderNumber parameter if available
    if (callbackData.orderNumber && !transactionNo) {
      transactionNo = callbackData.orderNumber;
      console.log('Using orderNumber as transaction number:', transactionNo);
    }
    
    // Complete 3D Secure authentication with Paylink
    const completionResult = await complete3DSecureAuthentication({
      PaRes: paRes,
      MD: callbackData.MD,
      transactionNo: transactionNo,
      orderNumber: callbackData.orderNumber
    });

    console.log('3DS authentication completion result:', {
      success: completionResult.success,
      status: completionResult.data?.status,
      error: completionResult.error
    });

    // If the authentication failed, return error
    if (!completionResult.success) {
      return NextResponse.json(
        { error: 'Failed to complete 3D Secure authentication', details: completionResult.error },
        { status: 500 }
      );
    }

    // Extract transaction data from the completion result
    const transactionData = completionResult.data;
    const invoiceId = transactionData.invoiceId || transactionData.id;
    // Use the result transaction number or fall back to the one we sent
    const resultTransactionNo = transactionData.transactionNo || transactionNo || callbackData.MD;

    // Get the full invoice details to confirm payment status
    if (invoiceId) {
      const invoiceDetails = await getInvoice(invoiceId);
      
      if (invoiceDetails.success && invoiceDetails.data) {
        const paymentStatus = invoiceDetails.data.status?.toLowerCase() || '';
        const isPaid = (paymentStatus === 'paid' || paymentStatus === 'completed') && invoiceDetails.data.paidDate;
        
        // Update the transaction in our database
        try {
          let transactionRecord = null;
          
          // Look up the transaction by invoice ID and transaction ID
          // Removing paylink_reference as it doesn't exist in the schema
          const transactionResults = await executeQuery(`
            SELECT * FROM payment_transactions 
            WHERE transaction_id = ? 
          `, [resultTransactionNo]);
          
          // If not found by transaction_id, try to look up by paylink_invoice_id if it exists
          if (transactionResults.length === 0 && invoiceId) {
            // First check if paylink_invoice_id column exists
            try {
              const tableInfo = await executeQuery(`DESCRIBE payment_transactions`);
              const hasInvoiceIdField = tableInfo.some(col => 
                col.Field === 'paylink_invoice_id' || col.Field === 'invoice_id'
              );
              
              if (hasInvoiceIdField) {
                const invoiceResults = await executeQuery(`
                  SELECT * FROM payment_transactions 
                  WHERE paylink_invoice_id = ? OR invoice_id = ?
                `, [invoiceId, invoiceId]);
                
                if (invoiceResults.length > 0) {
                  // Use the first result
                  transactionResults.push(invoiceResults[0]);
                }
              }
            } catch (describeError) {
              console.error('Error checking table structure:', describeError);
            }
          }
          
          if (transactionResults.length > 0) {
            transactionRecord = transactionResults[0];
            
            // Update the transaction status based on payment result
            await executeQuery(`
              UPDATE payment_transactions 
              SET status = ?, 
                  payment_gateway_response = ?,
                  updated_at = NOW()
              WHERE id = ?
            `, [
              isPaid ? 'completed' : 'failed',
              JSON.stringify({ 
                invoiceDetails: invoiceDetails.data,
                completion: transactionData,
                callbackData: {
                  ...callbackData,
                  PaRes: '[REDACTED]'
                }
              }),
              transactionRecord.id
            ]);
            
            // If payment is successful and we have a subscription ID, update it
            if (isPaid && transactionRecord.subscription_id) {
              await executeQuery(`
                UPDATE subscriptions
                SET status = 'active',
                    payment_confirmed = TRUE,
                    updated_at = NOW()
                WHERE id = ?
              `, [transactionRecord.subscription_id]);
              
              // Get proper base URL for redirect
              const redirectPath = `/dashboard/client/subscriptions/payment-status?status=success&invoice_id=${invoiceId}`;
              const baseUrl = getBaseUrl(request);
              
              if (baseUrl) {
                console.log('Redirecting to success page with base URL:', `${baseUrl}${redirectPath}`);
                return NextResponse.redirect(`${baseUrl}${redirectPath}`);
              } else {
                console.log('Redirecting to success page with relative URL');
                return NextResponse.redirect(new URL(redirectPath, request.url));
              }
            }
          } else {
            console.error(`Transaction not found for invoice ${invoiceId} or transaction ${transactionNo}`);
          }
        } catch (dbError) {
          console.error('Database error while updating transaction:', dbError);
        }
      }
    }

    // If we couldn't verify with invoice or update subscription, redirect to pending status
    const pendingPath = `/dashboard/client/subscriptions/payment-status?status=pending&invoice_id=${invoiceId || ''}`;
    const baseUrl = getBaseUrl(request);
    
    if (baseUrl) {
      console.log('Redirecting to pending page with base URL:', `${baseUrl}${pendingPath}`);
      return NextResponse.redirect(`${baseUrl}${pendingPath}`);
    } else {
      console.log('Redirecting to pending page with relative URL');
      return NextResponse.redirect(new URL(pendingPath, request.url));
    }

  } catch (error) {
    console.error('Error processing 3DS callback:', error);
    
    // Helper function to get the base URL for redirects
    function getBaseUrl(request) {
      let baseUrl = '';
      
      // Check if this is coming from an NGROK URL
      const requestUrl = request.url || '';
      const host = request.headers.get('host') || '';
      
      if (process.env.NGROK_URL) {
        baseUrl = process.env.NGROK_URL;
        console.log('Using NGROK URL for redirect:', baseUrl);
      } else if (process.env.NEXT_PUBLIC_APP_URL) {
        baseUrl = process.env.NEXT_PUBLIC_APP_URL;
        console.log('Using APP_URL for redirect:', baseUrl);
      } else if (requestUrl.includes('ngrok')) {
        // Extract ngrok URL from request
        const ngrokMatch = requestUrl.match(/(https?:\/\/[\w-]+\.ngrok-free\.app)/);
        if (ngrokMatch && ngrokMatch[1]) {
          baseUrl = ngrokMatch[1];
          console.log('Extracted NGROK URL for redirect:', baseUrl);
        }
      } else if (host && !host.includes('localhost')) {
        // Use the request host if it's not localhost
        const protocol = requestUrl.startsWith('https') ? 'https' : 'http';
        baseUrl = `${protocol}://${host}`;
        console.log('Using request host for redirect:', baseUrl);
      }
      
      return baseUrl;
    }
    
    // Log the full error for debugging
    console.error('Error details:', error.message, error.stack);
    
    // Return JSON error for API clients
    if (request.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Error processing 3D Secure callback', details: error.message },
        { status: 500 }
      );
    }
    
    // Redirect to error page for browser clients
    return NextResponse.redirect(
      new URL('/dashboard/client/subscriptions/payment-result?status=error&reason=3ds_processing_failed', request.url)
    );
  }
}

/**
 * GET handler to handle browser redirects from 3DS
 * This acts as a bridge to POST the data to our API endpoint
 */
export async function GET(request) {
  try {
    // Parse URL parameters
    const url = new URL(request.url);
    const paRes = url.searchParams.get('PaRes');
    const md = url.searchParams.get('MD');
    const orderNumber = url.searchParams.get('orderNumber') || url.searchParams.get('txn_id') || url.searchParams.get('transactionNo');
    
    console.log('3DS GET callback received with params:', {
      paRes: paRes ? 'Present (truncated)' : undefined,
      md: md || undefined,
      orderNumber: orderNumber || undefined,
      url: request.url
    });
    
    // If we have 3DS data, render a form to auto-submit to our API
    if (paRes && (md || orderNumber)) {
      // Create a client-side form that will POST to our 3DS callback endpoint
      // This is necessary because some browsers might not preserve all 3DS data in redirects
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Completing Payment...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              max-width: 500px;
              width: 90%;
            }
            .spinner {
              width: 40px;
              height: 40px;
              margin: 20px auto;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Completing Your Payment</h2>
            <p>Please wait while we verify your payment...</p>
            <div class="spinner"></div>
            <form id="threeDSForm" method="POST" action="/api/paylink/3ds-callback">
              <input type="hidden" name="PaRes" value="${encodeURIComponent(paRes)}">
              <input type="hidden" name="MD" value="${encodeURIComponent(md || '')}">              
              ${orderNumber ? `<input type="hidden" name="orderNumber" value="${encodeURIComponent(orderNumber)}">` : ''}
            </form>
            <script>
              // Submit the form automatically
              document.addEventListener('DOMContentLoaded', function() {
                document.getElementById('threeDSForm').submit();
              });
              
              // If the form doesn't submit within 5 seconds, submit manually
              setTimeout(function() {
                if (document.getElementById('threeDSForm')) {
                  document.getElementById('threeDSForm').submit();
                }
              }, 5000);
            </script>
          </div>
        </body>
        </html>
      `, {
        headers: {
          'Content-Type': 'text/html'
        }
      });
    }
    
    // If we don't have 3DS data, redirect to the normal payment status page
    // Use any status info from the URL if available
    const status = url.searchParams.get('status') || 'unknown';
    const redirectPath = `/dashboard/client/subscriptions/payment-status?status=${status}`;
    const baseUrl = getBaseUrl(request);
    
    if (baseUrl) {
      console.log('Redirecting to payment result page with base URL:', `${baseUrl}${redirectPath}`);
      return NextResponse.redirect(`${baseUrl}${redirectPath}`);
    } else {
      console.log('Redirecting to payment result page with relative URL');
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  } catch (error) {
    console.error('Error handling 3DS redirect:', error);
    const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('3DS redirect failed')}`;
    const baseUrl = getBaseUrl(request);
    
    if (baseUrl) {
      console.log('Redirecting to error page with base URL:', `${baseUrl}${errorPath}`);
      return NextResponse.redirect(`${baseUrl}${errorPath}`);
    } else {
      console.log('Redirecting to error page with relative URL');
      return NextResponse.redirect(new URL(errorPath, request.url));
    }
  }
}
