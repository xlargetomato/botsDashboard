import { NextResponse } from 'next/server';
import { complete3DSecureAuthentication, getTransactionByNumber } from '@/lib/paylink/api';
import { executeQuery } from '@/lib/db/config';
import { PAYLINK_CONFIG } from '@/lib/paylink/config';

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
      paRes: paRes ? `${paRes.substring(0, 10)}... [truncated]` : undefined,
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
    
    // Complete 3D Secure authentication with Paylink
    const completionResult = await complete3DSecureAuthentication({
      PaRes: paRes,
      MD: md
    });
    
    console.log('3DS completion result:', completionResult);
    
    // If completion returned a specific redirect URL, use it
    if (completionResult.redirectUrl) {
      console.log('Redirecting to URL from 3DS completion:', completionResult.redirectUrl);
      return NextResponse.redirect(completionResult.redirectUrl);
    }
    
    // Extract transaction number from completion result or MD
    let transactionNo;
    if (completionResult.transactionNo || completionResult.orderNumber) {
      transactionNo = completionResult.transactionNo || completionResult.orderNumber;
    } else {
      // Try to extract from MD if it's JSON
      try {
        const decodedMD = decodeURIComponent(md);
        const mdData = JSON.parse(decodedMD);
        transactionNo = mdData.transactionNo || mdData.orderNumber;
      } catch (e) {
        // If parsing fails, use MD directly as it might be the transaction number
        transactionNo = md;
      }
    }
    
    if (!transactionNo) {
      console.error('Could not determine transaction number from 3DS completion');
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Could not identify payment transaction')}`;
      const baseUrl = getBaseUrl(request);
      
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${errorPath}`);
      } else {
        return NextResponse.redirect(new URL(errorPath, request.url));
      }
    }
    
    // Wait a short time for Paylink to process the payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify payment status
    const paymentStatusResult = await getTransactionByNumber(transactionNo);
    
    console.log('Payment status check result:', paymentStatusResult);
    
    // If payment verification returned a redirect URL, use it
    if (paymentStatusResult.redirectUrl) {
      console.log('Redirecting to URL from payment verification:', paymentStatusResult.redirectUrl);
      return NextResponse.redirect(paymentStatusResult.redirectUrl);
    }
    
    // Update transaction in database
    if (transactionNo) {
      try {
        const paymentStatus = paymentStatusResult.status === 'paid' || 
                             paymentStatusResult.status === 'completed' ? 'completed' : 
                             paymentStatusResult.status === 'failed' ? 'failed' : 'pending';
        
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = ?, 
              updated_at = NOW(),
              paylink_response = ?
          WHERE transaction_id = ? OR transaction_no = ? OR paylink_reference = ? OR order_number = ?
        `, [
          paymentStatus,
          JSON.stringify(paymentStatusResult),
          transactionNo, transactionNo, transactionNo, transactionNo
        ]);
      } catch (dbError) {
        console.error('Failed to update transaction record:', dbError);
      }
    }
    
    // Determine redirect path based on payment status
    let redirectPath;
    if (paymentStatusResult.status === 'paid' || paymentStatusResult.status === 'completed') {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=success&txnId=${encodeURIComponent(transactionNo)}`;
    } else if (paymentStatusResult.status === 'failed') {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent(paymentStatusResult.message || 'Payment failed')}&txnId=${encodeURIComponent(transactionNo)}&code=${encodeURIComponent(paymentStatusResult.statusCode || '')}`;
    } else {
      // Default to pending
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=pending&txnId=${encodeURIComponent(transactionNo)}`;
    }
    
    const baseUrl = getBaseUrl(request);
    if (baseUrl) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}`);
    } else {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
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
    
    // Complete 3D Secure authentication with Paylink
    const completionResult = await complete3DSecureAuthentication({
      PaRes: finalPaRes,
      MD: finalMD
    });
    
    console.log('3DS completion result (GET):', completionResult);
    
    // Rest of the logic is identical to POST handler
    // If completion returned a specific redirect URL, use it
    if (completionResult.redirectUrl) {
      console.log('Redirecting to URL from 3DS completion:', completionResult.redirectUrl);
      return NextResponse.redirect(completionResult.redirectUrl);
    }
    
    // Extract transaction number from completion result or MD
    let transactionNo;
    if (completionResult.transactionNo || completionResult.orderNumber) {
      transactionNo = completionResult.transactionNo || completionResult.orderNumber;
    } else {
      // Try to extract from MD if it's JSON
      try {
        const decodedMD = decodeURIComponent(finalMD);
        const mdData = JSON.parse(decodedMD);
        transactionNo = mdData.transactionNo || mdData.orderNumber;
      } catch (e) {
        // If parsing fails, use MD directly as it might be the transaction number
        transactionNo = finalMD;
      }
    }
    
    if (!transactionNo) {
      console.error('Could not determine transaction number from 3DS completion (GET)');
      const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent('Could not identify payment transaction')}`;
      const baseUrl = getBaseUrl(request);
      
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${errorPath}`);
      } else {
        return NextResponse.redirect(new URL(errorPath, request.url));
      }
    }
    
    // Wait a short time for Paylink to process the payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify payment status
    const paymentStatusResult = await getTransactionByNumber(transactionNo);
    
    console.log('Payment status check result (GET):', paymentStatusResult);
    
    // If payment verification returned a redirect URL, use it
    if (paymentStatusResult.redirectUrl) {
      console.log('Redirecting to URL from payment verification:', paymentStatusResult.redirectUrl);
      return NextResponse.redirect(paymentStatusResult.redirectUrl);
    }
    
    // Update transaction in database
    if (transactionNo) {
      try {
        const paymentStatus = paymentStatusResult.status === 'paid' || 
                             paymentStatusResult.status === 'completed' ? 'completed' : 
                             paymentStatusResult.status === 'failed' ? 'failed' : 'pending';
        
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = ?, 
              updated_at = NOW(),
              paylink_response = ?
          WHERE transaction_id = ? OR transaction_no = ? OR paylink_reference = ? OR order_number = ?
        `, [
          paymentStatus,
          JSON.stringify(paymentStatusResult),
          transactionNo, transactionNo, transactionNo, transactionNo
        ]);
      } catch (dbError) {
        console.error('Failed to update transaction record:', dbError);
      }
    }
    
    // Determine redirect path based on payment status
    let redirectPath;
    if (paymentStatusResult.status === 'paid' || paymentStatusResult.status === 'completed') {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=success&txnId=${encodeURIComponent(transactionNo)}`;
    } else if (paymentStatusResult.status === 'failed') {
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent(paymentStatusResult.message || 'Payment failed')}&txnId=${encodeURIComponent(transactionNo)}&code=${encodeURIComponent(paymentStatusResult.statusCode || '')}`;
    } else {
      // Default to pending
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=pending&txnId=${encodeURIComponent(transactionNo)}`;
    }
    
    const baseUrl = getBaseUrl(request);
    if (baseUrl) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}`);
    } else {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
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
