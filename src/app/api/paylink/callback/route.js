import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';
import { validateConfig, verifyWebhookSignature } from '@/lib/paylink/service';
import { sendSubscriptionEmail } from '@/lib/email/emailService';
import PAYLINK_CONFIG from '@/lib/paylink/config';

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
      
      console.log('Plan lookup results:', planResults);
      
      if (planResults && planResults.length > 0) {
        // Successfully found the plan
        planName = planResults[0].name || '';
        console.log(`Found plan name: ${planName} for plan ID: ${planId}`);
      } else {
        console.warn(`No plan found with ID: ${planId}`);
      }
    } catch (err) {
      console.error('Failed to fetch plan details:', err.message);
    }
  } else {
    console.warn('No valid plan_id available after lookups');
  }
  
  // Only include valid parameters in redirect URLs
  // Skip empty values and placeholders entirely
  let urlParams = [];
  
  // Only include plan ID if it's not the zero UUID
  if (planId && planId !== '00000000-0000-0000-0000-000000000000') {
    urlParams.push(`planId=${encodeURIComponent(planId)}`);
  }
  
  // Only include plan name if not empty
  if (planName) {
    urlParams.push(`planName=${encodeURIComponent(planName)}`);
  }
  
  // Always include transaction ID
  if (transaction?.transaction_id) {
    urlParams.push(`transactionId=${encodeURIComponent(transaction.transaction_id)}`);
  }
  
  console.log('URL parameters:', urlParams);
  
  // Join all valid parameters
  const baseParams = urlParams.join('&');
  
  // If the invoice was already processed by the webhook, the status should be updated
  if (transaction.status === 'completed') {
    // Payment completed - redirect to success page
    redirectPath = `/dashboard/client/subscriptions/payment-status?status=success`;
    // Only add parameters if we have any
    if (baseParams) {
      redirectPath += `&${baseParams}`;
    }
  } else if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    // Payment failed - redirect to failure page
    redirectPath = `/dashboard/client/subscriptions/payment-status?status=failed&reason=${encodeURIComponent(transaction.status)}`;
    // Only add parameters if we have any
    if (baseParams) {
      redirectPath += `&${baseParams}`;
    }
  } else {
    // Payment still pending - redirect to pending page
    redirectPath = `/dashboard/client/subscriptions/payment-status?status=pending`;
    // Only add parameters if we have any
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
}

/**
 * GET handler for browser redirects after payment completion
 * This handles when users are redirected back from the payment gateway
 */
export async function GET(request) {
  try {
    // Get the transaction ID and subscription ID from the URL query parameters
    const url = new URL(request.url);
    // Look for transaction ID in multiple possible parameter names
    const txnId = url.searchParams.get('txn_id') || 
                  url.searchParams.get('transactionNo') || 
                  url.searchParams.get('orderNumber') || 
                  url.searchParams.get('invoiceId');
    const subscriptionIdFromUrl = url.searchParams.get('subscription_id') || url.searchParams.get('externalOrderNumber');
    
    // First, try to get error information from request body (JSON)
    let statusCode, errorMsg, paylinkResponse;
    try {
      // Clone the request to read the body
      const clonedRequest = request.clone();
      // Try to parse response as JSON
      const responseJson = await clonedRequest.json().catch(() => null);
      
      // If we have a valid JSON response, extract error info
      if (responseJson) {
        paylinkResponse = responseJson;
        statusCode = responseJson.statusCode?.toString();
        errorMsg = responseJson.message || responseJson.error;
      }
    } catch (parseError) {
      // Ignore parse errors - this is just a best-effort attempt
      console.log('No JSON body in redirect request (this is normal)');
    }
    
    // Check if this is an error response from Paylink
    if (statusCode && statusCode !== '200' && errorMsg) {
      console.error('Error response from Paylink:', { statusCode, errorMsg });
      
      // Get the base URL for redirect
      let baseUrl = getBaseUrl(request);
      const redirectPath = `/dashboard/client/subscriptions/payment-status?status=failed&reason=${encodeURIComponent(errorMsg)}`;
      
      // Use baseUrl if available, otherwise fallback to relative URL
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${redirectPath}`);
      } else {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    
    // Validate we have at least the transaction ID
    if (!txnId && !subscriptionIdFromUrl) {
      console.error('Missing transaction or subscription ID in redirect');
      
      // Get the base URL for redirect
      let baseUrl = getBaseUrl(request);
      const redirectPath = '/dashboard/client/subscriptions/payment-status?status=failed&reason=Missing+transaction+information';
      
      // Use baseUrl if available, otherwise fallback to relative URL
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${redirectPath}`);
      } else {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    
    // Look up transaction in database by transaction ID
    let paymentTransaction;
    let queryResult;
    
    // Get both the transaction ID and order number from the request URL
    const requestUrl = new URL(request.url);
    const orderNumber = requestUrl.searchParams.get('orderNumber');
    console.log('DEBUG: Looking up transaction with txnId:', txnId, 'orderNumber:', orderNumber);
    
    // First, check what transaction IDs exist in the database
    try {
      const allTransactions = await executeQuery('SELECT id, transaction_id FROM payment_transactions LIMIT 10');
      console.log('DEBUG: Recent transactions in database:', allTransactions);
    } catch (e) {
      console.error('Error fetching recent transactions:', e);
    }
    
    if (txnId || orderNumber) {
      // Try multiple lookups to find the transaction
      const attempts = [];
      
      // Try all possible combinations of IDs that might be in the database
      if (txnId) attempts.push(txnId);
      if (orderNumber) attempts.push(orderNumber);
      
      for (const attemptId of attempts) {
        try {
          console.log(`DEBUG: Attempting to find transaction with ID: ${attemptId}`);
          
          // Try exact match
          queryResult = await executeQuery(`
            SELECT * FROM payment_transactions 
            WHERE transaction_id = ?
          `, [attemptId]);
          
          if (queryResult.length > 0) {
            console.log(`Found transaction using ID: ${attemptId}`);
            break; // Stop searching if we found a match
          }
          
          // Try partial match with LIKE
          queryResult = await executeQuery(`
            SELECT * FROM payment_transactions 
            WHERE transaction_id LIKE ?
          `, [`%${attemptId}%`]);
          
          if (queryResult.length > 0) {
            console.log(`Found transaction using LIKE search for ID: ${attemptId}`);
            break; // Stop searching if we found a match
          }
        } catch (dbError) {
          console.error(`Error searching for transaction with ID ${attemptId}:`, dbError);
        }
      }
      
      // If we found a transaction, use it
      if (queryResult && queryResult.length > 0) {
        paymentTransaction = queryResult[0];
        console.log('DEBUG: Found payment transaction:', paymentTransaction);
      } else {
        console.log('DEBUG: Failed to find transaction after trying all possible IDs');
      }
    }
    
    // If not found and we have a subscription ID, try to find the transaction by subscription ID
    if (!paymentTransaction && subscriptionIdFromUrl) {
      queryResult = await executeQuery(`
        SELECT * FROM payment_transactions 
        WHERE subscription_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [subscriptionIdFromUrl]);
      
      if (queryResult.length > 0) {
        paymentTransaction = queryResult[0];
      }
    }
    
    // Skip checking for mapping table since it doesn't exist in the database schema
    if (!paymentTransaction) {
      // Log that we're skipping this step due to missing table
      console.log('Skipping mapping table check - table does not exist in schema');
    }
    
    // If we couldn't find the transaction, redirect to error page
    if (!paymentTransaction) {
      console.error('Payment transaction not found for redirect:', { txnId, subscriptionIdFromUrl });
      
      // Get the base URL for redirect
      let baseUrl = getBaseUrl(request);
      const redirectPath = '/dashboard/client/subscriptions/payment-status?status=failed&reason=Transaction+not+found';
      
      // Use baseUrl if available, otherwise fallback to relative URL
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${redirectPath}`);
      } else {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    
    // Check if this subscription has a subscription associated with it
    const subscriptionId = paymentTransaction.subscription_id;
    if (!subscriptionId) {
      // This is a one-time payment, not a subscription
      // For now, redirect to a general success page
      let baseUrl = getBaseUrl(request);
      const redirectPath = '/dashboard/client/subscriptions/payment-status?status=success&type=onetime';
      
      // Use baseUrl if available, otherwise fallback to relative URL
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${redirectPath}`);
      } else {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    
    // Get subscription details
    const subscriptionResults = await executeQuery(`
      SELECT * FROM subscriptions WHERE id = ?
    `, [subscriptionId]);
    
    if (subscriptionResults.length === 0) {
      console.error('Subscription not found for payment:', { subscriptionId });
      
      // Get the base URL for redirect
      let baseUrl = getBaseUrl(request);
      const redirectPath = '/dashboard/client/subscriptions/payment-status?status=failed&reason=Subscription+not+found';
      
      // Use baseUrl if available, otherwise fallback to relative URL
      if (baseUrl) {
        return NextResponse.redirect(`${baseUrl}${redirectPath}`);
      } else {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    
    const subscription = subscriptionResults[0];
    
    // Check invoice status with Paylink if we have an invoice ID
    if (paymentTransaction.paylink_invoice_id) {
      try {
        // We'll try to get the latest status from Paylink
        const invoice = await getInvoice(paymentTransaction.paylink_invoice_id);
        
        if (invoice && invoice.status) {
          // Parse the Paylink status
          const paylinkStatus = invoice.status.toLowerCase();
          
          // Map Paylink status to our internal status
          let newStatus;
          if (paylinkStatus === 'paid' || paylinkStatus === 'completed') {
            newStatus = 'completed';
          } else if (paylinkStatus === 'failed' || paylinkStatus === 'cancelled') {
            newStatus = 'failed';
          } else {
            newStatus = 'pending';
          }
          
          // Update our transaction status if it's different
          if (newStatus !== paymentTransaction.status) {
            await executeQuery(`
              UPDATE payment_transactions 
              SET status = ?, 
                  updated_at = NOW() 
              WHERE id = ?
            `, [newStatus, paymentTransaction.id]);
            
            // Update our local record of the transaction status
            paymentTransaction.status = newStatus;
            
            // If status is now completed and subscription is still pending, update it
            if (newStatus === 'completed' && subscription.status === 'pending') {
              await executeQuery(`
                UPDATE subscriptions 
                SET status = 'active', 
                    payment_confirmed = TRUE, 
                    updated_at = NOW() 
                WHERE id = ?
              `, [subscriptionId]);
              
              // Update our local record
              subscription.status = 'active';
            }
          }
        }
      } catch (invoiceError) {
        // Non-fatal error, we'll proceed with the data we have
        console.warn('Error fetching invoice from Paylink (non-fatal):', invoiceError.message);
      }
    }
    
    // Process the subscription and redirect appropriately
    return await processSubscriptionForRedirect(subscription, paymentTransaction, request);
  } catch (error) {
    console.error('Error processing payment redirect:', error);
    
    // Get the base URL for redirect
    let baseUrl = '';
    try {
      baseUrl = getBaseUrl(request);
    } catch (urlError) {
      // Ignore errors
    }
    
    const redirectPath = '/dashboard/client/subscriptions/payment-status?status=failed&reason=Server+error';
    
    // Use baseUrl if available, otherwise fallback to relative URL
    if (baseUrl) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}`);
    } else {
      try {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      } catch (redirectError) {
        // Last resort
        return NextResponse.json(
          { error: 'Server error processing payment redirect' },
          { status: 500 }
        );
      }
    }
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
    // Verify the Paylink configuration first
    const configStatus = validateConfig();
    if (!configStatus.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Paylink configuration',
        details: {
          missingVars: configStatus.missingVars
        }
      }, { status: 500 });
    }
    
    // Get the request body as text for signature verification
    const requestBodyText = await request.text();
    
    // Verify the webhook signature to ensure it's a legitimate request from Paylink
    const isValidWebhook = verifyWebhookSignature(request.headers, requestBodyText);
    
    // If the signature is invalid and we're in production, reject the request
    if (!isValidWebhook && PAYLINK_CONFIG.IS_PRODUCTION) {
      console.error('Invalid Paylink webhook signature');
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook signature'
      }, { status: 403 });
    }
    
    // Parse the request body
    let callbackData;
    try {
      callbackData = JSON.parse(requestBodyText);
    } catch (parseError) {
      console.error('Error parsing Paylink callback data:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in webhook payload'
      }, { status: 400 });
    }
    
    // Extract transaction identifiers from callback data
    // Paylink uses different field names in different environments, so check all possibilities
    const invoiceId = callbackData.invoice_id || callbackData.invoiceId || callbackData.id || 
                     callbackData.transactionNo || callbackData.transactionId || callbackData.transaction_id;
    
    const transactionId = callbackData.transaction_id || callbackData.transactionId || 
                          callbackData.orderNumber || callbackData.order_number || callbackData.reference;
    
    // Get status from callback data or default to 'pending'
    const status = (callbackData.status || callbackData.paymentStatus || '').toLowerCase();
    const paymentStatus = status === 'paid' || status === 'completed' || status === 'success' ? 'completed' : 
                        status === 'failed' || status === 'cancelled' ? 'failed' : 'pending';
    
    // Additional data from callback
    const paidAmount = callbackData.amount || callbackData.paidAmount;
    const currency = callbackData.currency || 'SAR';
    
    console.log('Paylink callback received', {
      url: request.url,
      environment: process.env.PAYLINK_ENVIRONMENT || 'unknown'
    });
    
    console.log('Payment callback received:', {
      invoiceId,
      transactionId,
      status: paymentStatus,
      amount: paidAmount,
      currency
    });
    
    // Validate that we have at least one identifier
    if (!invoiceId && !transactionId) {
      console.error('Missing payment identifiers in callback');
      return NextResponse.json(
        { error: 'Missing payment identifiers in callback data' },
        { status: 400 }
      );
    }

    // Start a database transaction for atomicity
    try {
      await executeQuery('START TRANSACTION');
      
      // Find the transaction in our database
      let paymentTransaction;
      let queryResult;
      
      // First try to find by invoice ID if available
      if (invoiceId) {
        queryResult = await executeQuery(`
          SELECT * FROM payment_transactions 
          WHERE paylink_invoice_id = ?
        `, [invoiceId]);
        
        if (queryResult.length > 0) {
          paymentTransaction = queryResult[0];
        }
      }
      
      // If not found by invoice ID, try transaction ID
      if (!paymentTransaction && transactionId) {
        queryResult = await executeQuery(`
          SELECT * FROM payment_transactions 
          WHERE transaction_id = ? OR paylink_reference = ?
        `, [transactionId, transactionId]);
        
        if (queryResult.length > 0) {
          paymentTransaction = queryResult[0];
        }
      }
      
      // Skip mapping table check since it doesn't exist in the schema
      if (!paymentTransaction) {
        console.log('Skipping mapping table check - table does not exist in schema');
      }
      
      // If we couldn't find the transaction, return error
      if (!paymentTransaction) {
        console.error('Payment transaction not found for:', { invoiceId, transactionId });
        await executeQuery('ROLLBACK');
        return NextResponse.json(
          { error: 'Payment transaction not found in our records' },
          { status: 404 }
        );
      }
      
      // Get the subscription ID from the transaction
      const subscriptionId = paymentTransaction.subscription_id;
      
      // Get subscription details if available
      let subscription = null;
      let userId = paymentTransaction.user_id; // This might be null if not directly on the transaction
      
      if (subscriptionId) {
        const subscriptionResults = await executeQuery(`
          SELECT * FROM subscriptions WHERE id = ?
        `, [subscriptionId]);
        
        if (subscriptionResults.length > 0) {
          subscription = subscriptionResults[0];
          
          // Ensure we have a user ID for subscription history and email notifications
          if (!userId && subscription && subscription.user_id) {
            userId = subscription.user_id;
            console.log('Using user ID from subscription record:', userId);
          } else if (!userId) {
            console.warn('No user ID found for payment transaction or subscription');
          }
        }
      }

      // For successful payments, update payment and subscription status
      if (paymentStatus === 'completed') {
        // Update payment transaction record
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = 'completed', 
              payment_gateway_response = ?, 
              updated_at = NOW() 
          WHERE id = ?
        `, [JSON.stringify(callbackData), paymentTransaction.id]);
        
        // If there's a subscription, update it
        if (subscription) {
          // Update subscription status to active only if it was pending
          // This prevents premature subscription activation
          await executeQuery(`
            UPDATE subscriptions 
            SET status = CASE 
                  WHEN status = 'pending' THEN 'active'
                  WHEN status = 'payment_failed' THEN 'active'
                  ELSE status
                END, 
                payment_confirmed = TRUE, 
                updated_at = NOW() 
            WHERE id = ?
          `, [subscriptionId]);
          
          // Add subscription history record if we have a user ID
          if (userId) {
            await executeQuery(`
              INSERT INTO subscription_history 
              (id, subscription_id, user_id, action, details, created_at)
              VALUES (UUID(), ?, ?, 'payment_completed', ?, NOW())
            `, [
              subscriptionId,
              userId,
            JSON.stringify({
              invoiceId,
              transactionId,
              paymentMethod: 'paylink',
              amount: paymentTransaction.amount,
              currency,
              completedAt: new Date().toISOString()
            })
          ]);
          }
          
          // Try to send email notification if available
          try {
            if (typeof sendSubscriptionEmail === 'function') {
              await sendSubscriptionEmail(userId, 'payment_success', {
                subscription,
                transaction: paymentTransaction,
                invoice: { id: invoiceId, status: paymentStatus }
              });
            }
          } catch (emailError) {
            console.warn('Error sending email notification (non-fatal):', emailError.message);
          }
        }
      } 
      // For failed payments
      else if (paymentStatus === 'failed') {
        // Check for specific error codes from Paylink that indicate payment failure
        let failureReason = '';
        if (callbackData.statusCode) {
          // Convert to number if it's a string
          const numericStatusCode = parseInt(callbackData.statusCode, 10);
          
          // Handle specific error codes
          if ([400, 412, 451, 500].includes(numericStatusCode)) {
            failureReason = callbackData.message || `Payment rejected with code ${callbackData.statusCode}`;
            console.log(`Payment failed with status code ${callbackData.statusCode}: ${failureReason}`);
          }
        }
        
        // If no error code triggered, check the status string
        if (!failureReason) {
          // Map Paylink status to our system
          if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'rejected' || status.toLowerCase() === 'error' || status.toLowerCase().includes('fail')) {
            failureReason = callbackData.message || 'Payment failed or was rejected';
          }
        }
        
        // Additional check for payment errors in the body message
        if (callbackData.message && (callbackData.message.toLowerCase().includes('error') || callbackData.message.toLowerCase().includes('fail') || callbackData.message.toLowerCase().includes('reject'))) {
          failureReason = callbackData.message;
        }
        
        // Update payment transaction record
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = 'failed', 
              payment_gateway_response = ?,
              error_message = ?,
              updated_at = NOW() 
          WHERE id = ?
        `, [JSON.stringify(callbackData), failureReason || 'Payment processing failed', paymentTransaction.id]);
        
        // If there's a subscription, update it
        if (subscription) {
          // Update subscription status to available so user can try again
          await executeQuery(`
            UPDATE subscriptions 
            SET status = 'available', 
                error_message = ?,
                updated_at = NOW() 
            WHERE id = ?
          `, [failureReason || 'Payment processing failed', subscriptionId]);
          
          // Add subscription history record if we have a user ID
          if (userId) {
            await executeQuery(`
              INSERT INTO subscription_history 
              (id, subscription_id, user_id, action, details, created_at)
              VALUES (UUID(), ?, ?, 'payment_failed', ?, NOW())
            `, [
              subscriptionId,
              userId,
              JSON.stringify({
                invoiceId,
                transactionId,
                paymentMethod: 'paylink',
                failureReason: failureReason || 'Payment processing failed',
                errorCode: callbackData.statusCode || '',
                failedAt: new Date().toISOString()
              })
            ]);
          }
        }
      }
      // For pending payments (or any other status)
      else {
        // Just update the transaction status
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = 'pending', 
              payment_gateway_response = ?, 
              updated_at = NOW() 
          WHERE id = ?
        `, [JSON.stringify(callbackData), paymentTransaction.id]);
      }
      
      // Commit the transaction
      await executeQuery('COMMIT');
      
      // Return success response
      return NextResponse.json({
        success: true,
        status: paymentStatus,
        invoiceId,
        transactionId,
        message: `Payment ${paymentStatus}`
      });
    } catch (dbError) {
      // Rollback on error
      try {
        await executeQuery('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      
      console.error('Database error processing payment callback:', dbError);
      
      return NextResponse.json({
        success: false,
        error: 'Database error processing payment',
        message: dbError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing payment callback:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Server error processing payment callback',
      message: error.message
    }, { status: 500 });
  }
}