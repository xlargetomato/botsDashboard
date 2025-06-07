import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';
import { validateConfig, verifyWebhookSignature } from '@/lib/paylink/service';
import { sendSubscriptionEmail } from '@/lib/email/emailService';
import PAYLINK_CONFIG from '@/lib/paylink/config';
import { pool } from '@/lib/db/config';

/**
 * Helper function to get the base URL for redirects
 */
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

/**
 * Helper function to process subscription and redirect appropriately
 */
async function processSubscriptionForRedirect(subscription, transaction, request) {
  try {
    // Get base URL for redirect
    let baseUrl = getBaseUrl(request);
    let redirectPath = '';
    
    // Get the plan details from the database if possible
    let planName = '';
    let planId = subscription?.plan_id || '';
    
    // Check if planId is valid or missing - zero UUID indicates a problem
    if (!planId || planId === '00000000-0000-0000-0000-000000000000') {
      console.log('Invalid or missing plan_id in subscription, trying to get it from transaction data');
      
      // If we have a transaction ID, try to get the correct subscription data
      if (transaction?.transaction_id) {
        try {
          // Get transaction data to see if it has plan info
          console.log(`Looking up full transaction data for ID: ${transaction.transaction_id}`);
          
          // First check if we can find a subscription with this transaction ID
          const subscriptionLookup = await executeQuery(
            `SELECT s.*, p.id AS actual_plan_id, p.name AS plan_name 
             FROM subscriptions s 
             LEFT JOIN subscription_plans p ON s.plan_id = p.id 
             WHERE s.transaction_id = ?`,
            [transaction.transaction_id]
          );
          
          if (subscriptionLookup && subscriptionLookup.length > 0) {
            // Found a subscription with this transaction ID
            const fullSubscription = subscriptionLookup[0];
            if (fullSubscription.actual_plan_id) {
              planId = fullSubscription.actual_plan_id;
              planName = fullSubscription.plan_name || '';
              console.log(`Found plan from transaction lookup: ID=${planId}, Name=${planName}`);
            }
          } else {
            console.log('No subscription found with this transaction ID');
          }
        } catch (lookupError) {
          console.error('Error looking up transaction data:', lookupError);
          // Continue with what we have
        }
      }
    }
    
    // If we still have a valid plan ID, double-check the plan details
    if (planId && planId !== '00000000-0000-0000-0000-000000000000') {
      try {
        console.log(`Looking up plan with ID: ${planId}`);
        const planResults = await executeQuery(
          `SELECT * FROM subscription_plans WHERE id = ?`,
          [planId]
        );
        
        if (planResults && planResults.length > 0) {
          planName = planResults[0].name || '';
          console.log(`Found plan name: ${planName} for plan ID: ${planId}`);
        }
      } catch (err) {
        console.error('Failed to fetch plan details:', err);
        // Continue with what we have
      }
    }
    
    // Only include valid parameters in redirect URLs
    let urlParams = [];
    
    // Only include plan ID if it's not the zero UUID
    if (planId && planId !== '00000000-0000-0000-0000-000000000000') {
      urlParams.push(`planId=${encodeURIComponent(planId)}`);
    }
    
    // Only include plan name if not empty
    if (planName) {
      urlParams.push(`planName=${encodeURIComponent(planName)}`);
    }
    
    // Always include transaction ID if available
    if (transaction?.transaction_id) {
      urlParams.push(`transactionId=${encodeURIComponent(transaction.transaction_id)}`);
    }
    
    // Join all valid parameters
    const baseParams = urlParams.join('&');
    
    // If the invoice was already processed by the webhook, the status should be updated
    if (transaction.status === 'completed') {
      // Payment completed - redirect to success page
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=success`;
      if (baseParams) {
        redirectPath += `&${baseParams}`;
      }
    } else if (transaction.status === 'failed' || transaction.status === 'cancelled') {
      // Payment failed - redirect to failure page with reason
      const reason = transaction.error_message || transaction.status;
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=failed&reason=${encodeURIComponent(reason)}`;
      if (baseParams) {
        redirectPath += `&${baseParams}`;
      }
    } else {
      // Payment still pending - redirect to pending page
      redirectPath = `/dashboard/client/subscriptions/payment-status?status=pending`;
      if (baseParams) {
        redirectPath += `&${baseParams}`;
      }
    }
    
    // Use baseUrl if available, otherwise fallback to relative URL
    if (baseUrl) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}`);
    } else {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  } catch (error) {
    console.error('Error in processSubscriptionForRedirect:', {
      error: error.message,
      stack: error.stack,
      subscription: subscription?.id,
      transaction: transaction?.id
    });
    
    // Determine user-friendly error message
    let errorMessage = 'Error processing payment status';
    if (error.message.includes('Database')) {
      errorMessage = 'Database error while processing payment';
    } else if (error.message.includes('plan')) {
      errorMessage = 'Error retrieving subscription plan details';
    }
    
    // Get base URL for redirect
    let baseUrl = '';
    try {
      baseUrl = getBaseUrl(request);
    } catch (urlError) {
      // Ignore error and use relative URL
    }
    
    const redirectPath = `/dashboard/client/subscriptions/payment-status?status=failed&reason=${encodeURIComponent(errorMessage)}`;
    
    // Try to redirect with error message
    try {
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${redirectPath}`);
      } else {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    } catch (redirectError) {
      // Last resort - return JSON error
      return NextResponse.json(
        { error: 'Failed to process subscription redirect', details: errorMessage },
        { status: 500 }
      );
    }
  }
}

// Helper function to verify transaction status locally
async function verifyTransactionLocally(transactionData) {
  try {
    // First try to find the transaction in our database
    const query = `
      SELECT pt.*, s.id as subscription_id, s.status as subscription_status 
      FROM payment_transactions pt
      LEFT JOIN subscriptions s ON pt.subscription_id = s.id
      WHERE pt.id = ? 
      OR pt.order_number = ? 
      OR pt.transaction_no = ?
      ORDER BY pt.created_at DESC 
      LIMIT 1
    `;
    
    const results = await executeQuery(query, [
      transactionData.txn_id,
      transactionData.orderNumber,
      transactionData.transactionNo
    ]);

    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error verifying transaction locally:', error);
    return null;
  }
}

// Helper function to create or update subscription
async function handleSuccessfulPayment(transactionData) {
  try {
    console.log('Handling successful payment with data:', transactionData);

    // First verify transaction locally
    const existingTransaction = await verifyTransactionLocally(transactionData);
    console.log('Existing transaction found:', existingTransaction);

    // If we have an existing active subscription, just return it
    if (existingTransaction?.subscription_id && existingTransaction?.subscription_status === 'active') {
      console.log('Found existing active subscription:', existingTransaction.subscription_id);
      return existingTransaction.subscription_id;
    }

    // Start a transaction for data consistency
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert or update transaction
      const transactionQuery = `
        INSERT INTO payment_transactions (
          id,
          order_number,
          transaction_no,
          status,
          amount,
          plan_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'completed', ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          status = 'completed',
          updated_at = NOW(),
          plan_id = VALUES(plan_id)
      `;

      const [transactionResult] = await connection.execute(transactionQuery, [
        transactionData.txn_id,
        transactionData.orderNumber,
        transactionData.transactionNo,
        transactionData.amount || 0,
        transactionData.planId
      ]);

      console.log('Transaction created/updated:', transactionResult);

      // Create new subscription if one doesn't exist
      const subscriptionQuery = `
        INSERT INTO subscriptions (
          plan_id,
          status,
          payment_confirmed,
          transaction_id,
          created_at,
          updated_at
        ) VALUES (?, 'active', TRUE, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          status = 'active',
          payment_confirmed = TRUE,
          updated_at = NOW()
      `;

      const [subscriptionResult] = await connection.execute(subscriptionQuery, [
        transactionData.planId,
        transactionData.txn_id
      ]);

      console.log('Subscription created/updated:', subscriptionResult);

      // Update transaction with subscription ID if needed
      if (subscriptionResult.insertId) {
        const updateQuery = `
          UPDATE payment_transactions 
          SET subscription_id = ? 
          WHERE id = ?
        `;
        await connection.execute(updateQuery, [subscriptionResult.insertId, transactionData.txn_id]);
      }

      // Commit the transaction
      await connection.commit();
      console.log('Database transaction committed successfully');

      return subscriptionResult.insertId || existingTransaction?.subscription_id;
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('Error in database transaction:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

/**
 * GET handler for browser redirects after payment completion
 * This handles when users are redirected back from the payment gateway
 */
export async function GET(request) {
  let baseUrl = '';
  try {
    console.log('[callback/route.js GET Handler] Processing payment callback:', request.url);
    
    // Get base URL for redirects early
    try {
      baseUrl = getBaseUrl(request);
      console.log('Using base URL for redirects:', baseUrl);
    } catch (urlError) {
      console.error('Error getting base URL:', urlError);
      baseUrl = '';
    }

    const requestUrlObject = new URL(request.url);
    const { searchParams } = requestUrlObject;
    
    // Create a clean parameters object to remove duplicates
    const cleanParams = new Map();
    
    // Helper function to add parameter if it exists and is not empty
    const addParam = (key, value) => {
      if (value && !cleanParams.has(key)) {
        cleanParams.set(key, value);
      }
    };

    // Get all possible transaction identifiers
    const txnId = searchParams.get('txn_id') || 
                 searchParams.get('transactionId') || 
                 searchParams.get('transactionNo') || 
                 searchParams.get('orderId') || 
                 searchParams.get('invoiceId');
    
    const orderNumber = searchParams.get('orderNumber');
    const transactionNo = searchParams.get('transactionNo');
    const planId = searchParams.get('planId');
    const planName = searchParams.get('planName');
    const status = searchParams.get('status');

    console.log('Processing payment with status:', status);

    // If status is success, create or update subscription
    if (status === 'success' || status === 'completed') {
      try {
        console.log('Attempting to create/update subscription...');
        const subscriptionId = await handleSuccessfulPayment({
          txn_id: txnId,
          orderNumber,
          transactionNo,
          planId,
          planName
        });
        
        console.log('Subscription created/updated successfully:', subscriptionId);
        
        // Add success message to parameters
        addParam('message', 'Subscription activated successfully');
        addParam('subscription_id', subscriptionId);
      } catch (error) {
        console.error('Error creating subscription:', error);
        // Add error message to parameters
        addParam('error', 'Error activating subscription: ' + error.message);
      }
    }

    // Add parameters in order of priority, avoiding duplicates
    addParam('status', status);
    addParam('txn_id', txnId);
    addParam('orderNumber', orderNumber);
    addParam('transactionNo', transactionNo);
    addParam('planId', planId);
    addParam('planName', planName);

    // Create the redirect URL with clean parameters
    const redirectUrl = new URL('/dashboard/client/subscriptions/payment-status', baseUrl || request.url);
    const cleanSearchParams = new URLSearchParams();
    
    // Add clean parameters to URL
    cleanParams.forEach((value, key) => {
      cleanSearchParams.append(key, value);
    });
    
    redirectUrl.search = cleanSearchParams.toString();

    // Clean up any double slashes in the URL
    const finalUrl = redirectUrl.toString().replace(/([^:]\/)\/+/g, "$1");
    console.log('Redirecting to cleaned URL:', finalUrl);

    return NextResponse.redirect(finalUrl);
  } catch (error) {
    console.error('Error in callback handler:', error);
    
    // Even on error, redirect to payment-status with error information
    const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent(error.message)}`;
    return baseUrl ? 
      NextResponse.redirect(`${baseUrl}${errorPath}`) : 
      NextResponse.redirect(new URL(errorPath, request.url));
  }
}

/**
 * POST handler for Paylink.sa payment callback
 * This endpoint receives payment status updates from Paylink.sa
 * 
 * Note: This endpoint doesn't require auth because it's called by Paylink.sa
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const searchParams = new URL(request.url).searchParams;
    
    // Create a clean parameters object to remove duplicates
    const cleanParams = new Map();
    
    // Helper function to add parameter if it exists and is not empty
    const addParam = (key, value) => {
      if (value && !cleanParams.has(key)) {
        cleanParams.set(key, value);
      }
    };

    // Get all possible transaction identifiers
    const txnId = searchParams.get('txn_id') || 
                 data.orderNumber || 
                 data.transactionNo;
                 
    const orderNumber = data.orderNumber;
    const transactionNo = data.transactionNo;
    const planId = searchParams.get('planId');
    const planName = searchParams.get('planName');

    // Process the transaction status
    const status = data.status?.toLowerCase();
    let newStatus;
    
    if (status === 'paid' || status === 'completed' || status === 'success') {
      newStatus = 'completed';
      try {
        await handleSuccessfulPayment({
          txn_id: txnId,
          orderNumber,
          transactionNo,
          planId,
          planName,
          amount: data.amount
        });
        
        // Add success message to parameters
        addParam('message', 'Subscription activated successfully');
      } catch (error) {
        console.error('Error creating subscription:', error);
        // Add error message to parameters
        addParam('error', 'Error activating subscription');
      }
    } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      newStatus = 'failed';
    } else {
      newStatus = 'pending';
    }

    // Add clean parameters
    addParam('status', newStatus);
    addParam('txn_id', txnId);
    addParam('orderNumber', orderNumber);
    addParam('transactionNo', transactionNo);
    addParam('planId', planId);
    addParam('planName', planName);

    // Create the redirect URL with clean parameters
    const baseUrl = getBaseUrl(request);
    const redirectUrl = new URL('/dashboard/client/subscriptions/payment-status', baseUrl || request.url);
    const cleanSearchParams = new URLSearchParams();
    
    // Add clean parameters to URL
    cleanParams.forEach((value, key) => {
      cleanSearchParams.append(key, value);
    });
    
    redirectUrl.search = cleanSearchParams.toString();

    // Clean up any double slashes in the URL
    const finalUrl = redirectUrl.toString().replace(/([^:]\/)\/+/g, "$1");
    console.log('Redirecting to cleaned URL:', finalUrl);

    return NextResponse.redirect(finalUrl);
  } catch (error) {
    console.error('Payment callback error:', error);
    
    const baseUrl = getBaseUrl(request);
    const errorPath = `/dashboard/client/subscriptions/payment-status?status=error&message=${encodeURIComponent(error.message)}`;
    
    return baseUrl ? 
      NextResponse.redirect(`${baseUrl}${errorPath}`) : 
      NextResponse.redirect(new URL(errorPath, request.url));
  }
}