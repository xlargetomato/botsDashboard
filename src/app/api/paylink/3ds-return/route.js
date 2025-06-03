import { NextResponse } from 'next/server';
import { getTransactionByNumber, complete3DSecureAuthentication } from '@/lib/paylink/api';
import { executeQuery } from '@/lib/db/config';
import PAYLINK_CONFIG from '@/lib/paylink/config';

/**
 * Helper function to get the base URL for redirects
 * This ensures redirects work across environments (localhost, ngrok, production)
 */
function getBaseUrl(request) {
  // Try to get base URL from environment variables
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const ngrokUrl = process.env.NGROK_URL;
  
  // If we have an explicit ngrok URL (for development), use it
  if (ngrokUrl) {
    return ngrokUrl;
  }
  
  // If we have an app URL (for production), use it
  if (appUrl && !appUrl.includes('localhost')) {
    return appUrl;
  }
  
  // Fall back to request origin
  try {
    const requestUrl = new URL(request.url);
    // Ensure we're not using localhost in the redirect
    if (!requestUrl.hostname.includes('localhost')) {
      return `${requestUrl.protocol}//${requestUrl.host}`;
    }
  } catch (e) {
    console.error('Failed to parse request URL:', e);
  }
  
  // Last resort - use app URL even if localhost
  return appUrl || '';
}

/**
 * POST handler for 3DS return from ACS
 * This is called when the user returns from the 3D Secure authentication page
 */
export async function POST(request) {
  try {
    console.log('3DS return POST handler called');
    // Get form data from request
    const formData = await request.formData();
    
    // Extract PaRes and MD (transaction identifier)
    const paRes = formData.get('PaRes');
    const md = formData.get('MD');
    
    console.log('3DS return data received:', {
      paRes: paRes ? 'PRESENT (truncated)' : undefined,
      md: md ? `${md.substring(0, 10)}... [truncated]` : undefined
    });
    
    if (!paRes || !md) {
      console.error('Missing required 3DS return parameters');
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Missing 3D Secure authentication data')}`;
      const baseUrl = getBaseUrl(request);
      
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${errorPath}`);
      } else {
        return NextResponse.redirect(new URL(errorPath, request.url));
      }
    }
    
    // Extract transaction number from MD
    let transactionNo;
    try {
      const decoded = decodeURIComponent(md);
      try {
        const mdObj = JSON.parse(decoded);
        transactionNo = mdObj.transactionNo || mdObj.orderNumber || decoded;
      } catch {
        transactionNo = decoded;
      }
    } catch {
      transactionNo = md;
    }

    if (!transactionNo) {
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Could not identify payment transaction')}`;
      const baseUrl = getBaseUrl(request);
      return baseUrl ? NextResponse.redirect(`${baseUrl}${errorPath}`)
                     : NextResponse.redirect(new URL(errorPath, request.url));
    }
    
    // Complete 3D Secure authentication with Paylink API
    console.log('Completing 3DS authentication with transaction number:', transactionNo);
    const authResult = await complete3DSecureAuthentication({
      PaRes: paRes,
      MD: md,
      transactionNo: transactionNo
    });
    
    console.log('3DS authentication result:', {
      success: authResult.success,
      status: authResult.status,
      message: authResult.message,
      statusCode: authResult.statusCode
    });
    
    // Give Paylink a moment to finalize the invoice before querying
    await new Promise(r => setTimeout(r, 2000));

    // Verify transaction status
    const verification = await getTransactionByNumber(transactionNo);
    console.log('Paylink invoice verification:', {
      success: verification.success,
      status: verification.status,
      statusCode: verification.statusCode,
      message: verification.message
    });

    // Update database with transaction status if possible
    try {
      const transactionResults = await executeQuery(`
        SELECT * FROM payment_transactions 
        WHERE transaction_id = ?
      `, [transactionNo]);
      
      if (transactionResults.length > 0) {
        const transactionRecord = transactionResults[0];
        const isPaid = verification.status === 'paid' || verification.status === 'completed';
        
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = ?, 
              payment_gateway_response = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [
          isPaid ? 'completed' : 'failed',
          JSON.stringify({ 
            verification: verification,
            authResult: authResult
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
        }
      }
    } catch (dbError) {
      console.error('Database error while updating transaction:', dbError);
    }

    // Determine the redirect path based on verification result
    let redirectPath;
    if (authResult.success && (verification.status === 'paid' || verification.status === 'completed')) {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=success&txnId=${encodeURIComponent(transactionNo)}`;
    } else if (verification.statusCode === 451 || verification.statusCode === 452) {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Payment declined by bank')}&code=${verification.statusCode}&txnId=${encodeURIComponent(transactionNo)}`;
    } else if (verification.statusCode === 412 || !authResult.success) {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent(verification.message || authResult.message || 'Payment processing error')}&code=${verification.statusCode || authResult.statusCode || 412}&txnId=${encodeURIComponent(transactionNo)}`;
    } else {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=pending&txnId=${encodeURIComponent(transactionNo)}`;
    }

    const baseUrl = getBaseUrl(request);
    return baseUrl ? NextResponse.redirect(`${baseUrl}${redirectPath}`)
                   : NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error('Error processing 3DS return:', error);
    
    const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Error processing payment authentication: ' + error.message)}`;
    const baseUrl = getBaseUrl(request);
    
    if (baseUrl) {
      return NextResponse.redirect(`${baseUrl}${errorPath}`);
    } else {
      return NextResponse.redirect(new URL(errorPath, request.url));
    }
  }
}

/**
 * GET handler for 3DS return from ACS
 * Some ACS implementations use GET instead of POST for the return
 */
export async function GET(request) {
  try {
    console.log('3DS return GET handler called');
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    // Check for error parameters in the URL
    if (params.statusCode && params.statusCode !== '200' && params.statusCode !== '100') {
      console.error(`3DS return failed with status: ${params.statusCode}, message: ${params.msg || 'Unknown error'}`);  
      
      // Handle specific error codes with appropriate user-friendly messages
      let errorReason = '';
      const statusCode = parseInt(params.statusCode);
      
      if (statusCode === 412) {
        errorReason = 'Payment+server+error';
        console.log('Detected Paylink server error (412)');
      } else if (statusCode === 451) {
        errorReason = 'Payment+declined';
        console.log('Detected payment declined error (451)');
      } else {
        errorReason = encodeURIComponent(params.msg || 'Payment processing error');
      }
      
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${errorReason}`;
      const baseUrl = getBaseUrl(request);
      
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${errorPath}`);
      } else {
        return NextResponse.redirect(new URL(errorPath, request.url));
      }
    }
    
    // Extract PaRes and MD from query parameters
    const paRes = url.searchParams.get('PaRes');
    const md = url.searchParams.get('MD');
    
    // Also check alternative parameter names
    const pares = url.searchParams.get('pares') || url.searchParams.get('PARes');
    const merchantData = url.searchParams.get('md') || url.searchParams.get('merchantData');
    
    const finalPaRes = paRes || pares;
    const finalMD = md || merchantData;
    
    console.log('3DS return data received via GET:', {
      paRes: finalPaRes ? `${finalPaRes.substring(0, 10)}... [truncated]` : undefined,
      md: finalMD ? `${finalMD.substring(0, 10)}... [truncated]` : undefined
    });
    
    if (!finalPaRes || !finalMD) {
      console.error('Missing required 3DS return parameters in GET request');
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Missing 3D Secure authentication data')}`;
      const baseUrl = getBaseUrl(request);
      
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${errorPath}`);
      } else {
        return NextResponse.redirect(new URL(errorPath, request.url));
      }
    }
    
    // Complete 3D Secure authentication with Paylink (browser has already posted PaRes to Paylink)
    // Instead of calling undocumented server-side endpoints, just verify the payment.
    let transactionNo;
    try {
      const decoded = decodeURIComponent(finalMD);
      try {
        const mdObj = JSON.parse(decoded);
        transactionNo = mdObj.transactionNo || mdObj.orderNumber || decoded;
      } catch {
        transactionNo = decoded;
      }
    } catch {
      transactionNo = finalMD;
    }

    if (!transactionNo) {
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Could not identify payment transaction')}`;
      const baseUrl = getBaseUrl(request);
      return baseUrl ? NextResponse.redirect(`${baseUrl}${errorPath}`)
                     : NextResponse.redirect(new URL(errorPath, request.url));
    }

    // Give Paylink a moment to finalise the invoice before querying
    await new Promise(r => setTimeout(r, 2000));

    const verification = await getTransactionByNumber(transactionNo);
    console.log('Paylink invoice verification:', verification);

    let redirectPath;
    if (verification.status === 'paid' || verification.status === 'completed') {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=success&txnId=${encodeURIComponent(transactionNo)}`;
    } else if (verification.status === 'failed') {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent(verification.message || 'Payment failed')}&txnId=${encodeURIComponent(transactionNo)}`;
    } else {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=pending&txnId=${encodeURIComponent(transactionNo)}`;
    }

    const baseUrl = getBaseUrl(request);
    return baseUrl ? NextResponse.redirect(`${baseUrl}${redirectPath}`)
                   : NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error('Error processing 3DS return (GET):', error);
    
    const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Error processing payment authentication: ' + error.message)}`;
    const baseUrl = getBaseUrl(request);
    
    if (baseUrl) {
      return NextResponse.redirect(`${baseUrl}${errorPath}`);
    } else {
      return NextResponse.redirect(new URL(errorPath, request.url));
    }
  }
}
