import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';
import { validateConfig } from '@/lib/paylink/service';
import { sendSubscriptionEmail } from '@/lib/email/emailService';
import PAYLINK_CONFIG from '@/lib/paylink/config';

/**
 * Helper function to process subscription and redirect appropriately
 */
function processSubscriptionForRedirect(subscription, transaction, request) {
  // If the invoice was already processed by the webhook, the status should be updated
  if (transaction.status === 'completed') {
    // Payment completed - redirect to success page
    return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=success&planName=${encodeURIComponent(subscription.plan_name)}`, request.url));
  } else if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    // Payment failed - redirect to failure page
    return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=failed&reason=${encodeURIComponent(transaction.status)}`, request.url));
  } else {
    // Payment still pending - redirect to pending page
    return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=pending&planName=${encodeURIComponent(subscription.plan_name)}`, request.url));
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
    const txnId = url.searchParams.get('txn_id');
    const subscriptionIdFromUrl = url.searchParams.get('subscription_id');
    
    if (!txnId) {
      return NextResponse.json(
        { error: 'Missing transaction ID in redirect URL' },
        { status: 400 }
      );
    }
    
    console.log(`Processing payment redirect with transaction ID: ${txnId} and subscription ID: ${subscriptionIdFromUrl || 'not provided'}`);
    
    // Find the transaction in the database
    const transactionResults = await executeQuery(`
      SELECT * FROM payment_transactions 
      WHERE transaction_id = ? OR paylink_reference = ?
    `, [txnId, txnId]);
    
    if (!transactionResults.length) {
      console.error(`Transaction not found: ${txnId}`);
      // Redirect to error page with message
      return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent('Transaction not found')}&txnId=${encodeURIComponent(txnId)}`, request.url));
    }
    
    const transaction = transactionResults[0];
    
    // Determine which subscription ID to use, prioritizing the URL parameter
    let subscriptionId = subscriptionIdFromUrl || transaction.subscription_id;
    
    if (!subscriptionId) {
      console.error(`No subscription ID found for transaction: ${txnId}`);
      return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent('Subscription not found')}&txnId=${encodeURIComponent(txnId)}`, request.url));
    }
    
    // Get the subscription details
    const subscriptionResults = await executeQuery(`
      SELECT * FROM subscriptions 
      WHERE id = ?
    `, [subscriptionId]);
    
    if (!subscriptionResults.length) {
      console.error(`Subscription not found: ${subscriptionId}`);
      return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent('Subscription not found')}&txnId=${encodeURIComponent(txnId)}`, request.url));
    }
    
    const subscription = subscriptionResults[0];
    
    // Process the subscription and redirect appropriately
    return processSubscriptionForRedirect(subscription, transaction, request);
  } catch (error) {
    console.error('Error processing payment redirect:', error);
    
    // Redirect to error page with generic message
    return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent('An error occurred processing your payment')}`, request.url));
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
    // Verify the Paylink configuration
    const configStatus = validateConfig();
    if (!configStatus.isValid) {
      console.error('Invalid Paylink configuration:', configStatus.missingVars);
      return NextResponse.json({ error: 'Invalid payment gateway configuration' }, { status: 500 });
    }

    // Get callback data - handle both JSON and form-encoded formats
    let callbackData;
    const contentType = request.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        callbackData = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        callbackData = {};
        for (const [key, value] of formData.entries()) {
          callbackData[key] = value;
        }
      } else {
        // Fallback - try different formats
        try {
          callbackData = await request.json();
        } catch (jsonError) {
          try {
            const text = await request.text();
            try {
              // Try to parse as URL-encoded
              const params = new URLSearchParams(text);
              callbackData = {};
              for (const [key, value] of params.entries()) {
                callbackData[key] = value;
              }
            } catch (parseError) {
              // Last resort - try to parse as JSON string in text
              try {
                callbackData = JSON.parse(text);
              } catch (finalError) {
                callbackData = { rawData: text };
              }
            }
          } catch (textError) {
            callbackData = {};
          }
        }
      }
    } catch (bodyError) {
      console.error('Error parsing callback request body:', bodyError);
      callbackData = {};
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
    
    // Log the callback details
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
      
      // If still not found, check mapping table
      if (!paymentTransaction) {
        try {
          const mappingResults = await executeQuery(`
            SELECT * FROM subscription_payment_mappings 
            WHERE paylink_invoice_id = ? OR transaction_id = ?
          `, [invoiceId, transactionId]);
          
          if (mappingResults.length > 0) {
            const mapping = mappingResults[0];
            
            // Try to find transaction using mapping
            queryResult = await executeQuery(`
              SELECT * FROM payment_transactions 
              WHERE subscription_id = ? 
              ORDER BY created_at DESC LIMIT 1
            `, [mapping.subscription_id]);
            
            if (queryResult.length > 0) {
              paymentTransaction = queryResult[0];
            }
          }
        } catch (mappingError) {
          // Mapping table might not exist, non-fatal error
          console.warn('Error checking mapping table (non-fatal):', mappingError.message);
        }
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
      const userId = paymentTransaction.user_id;
      
      // Get subscription details if available
      let subscription = null;
      if (subscriptionId) {
        const subscriptionResults = await executeQuery(`
          SELECT * FROM subscriptions WHERE id = ?
        `, [subscriptionId]);
        
        if (subscriptionResults.length > 0) {
          subscription = subscriptionResults[0];
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
          // Update subscription status to active
          await executeQuery(`
            UPDATE subscriptions 
            SET status = 'active', 
                payment_confirmed = TRUE, 
                updated_at = NOW() 
            WHERE id = ?
          `, [subscriptionId]);
          
          // Add subscription history record
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
        // Update payment transaction record
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = 'failed', 
              payment_gateway_response = ?, 
              updated_at = NOW() 
          WHERE id = ?
        `, [JSON.stringify(callbackData), paymentTransaction.id]);
        
        // If there's a subscription, update it
        if (subscription) {
          // Update subscription status to payment_failed
          await executeQuery(`
            UPDATE subscriptions 
            SET status = 'payment_failed', 
                updated_at = NOW() 
            WHERE id = ?
          `, [subscriptionId]);
          
          // Add subscription history record
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
              failureReason: callbackData.failureReason || 'Payment processing failed',
              failedAt: new Date().toISOString()
            })
          ]);
          
          // Try to send email notification if available
          try {
            if (typeof sendSubscriptionEmail === 'function') {
              await sendSubscriptionEmail(userId, 'payment_failed', {
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
