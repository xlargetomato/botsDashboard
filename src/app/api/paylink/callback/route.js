import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';
import { sendSubscriptionEmail } from '@/lib/email/emailService';
import { redirect } from 'next/navigation';

/**
 * GET handler for browser redirects after payment completion
 * This handles when users are redirected back from the payment gateway
 */
export async function GET(request) {
  try {
    // Get the transaction ID from the URL query parameters
    const url = new URL(request.url);
    const txnId = url.searchParams.get('txn_id');
    
    if (!txnId) {
      return NextResponse.json(
        { error: 'Missing transaction ID in redirect URL' },
        { status: 400 }
      );
    }
    
    console.log(`Processing payment redirect for transaction ID: ${txnId}`);
    
    // Find the transaction in the database
    const transactionResults = await executeQuery(`
      SELECT * FROM payment_transactions 
      WHERE transaction_id = ?
    `, [txnId]);
    
    if (!transactionResults.length) {
      console.error(`Transaction not found: ${txnId}`);
      // Redirect to error page with message
      return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent('Transaction not found')}`, request.url));
    }
    
    const transaction = transactionResults[0];
    const subscriptionId = transaction.subscription_id;
    
    // Get subscription details
    const subscriptionResults = await executeQuery(`
      SELECT s.*, p.name as plan_name 
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `, [subscriptionId]);
    
    if (!subscriptionResults.length) {
      console.error(`Subscription not found with ID: ${subscriptionId}`);
      
      // Log the actual data for debugging
      console.log('Transaction data:', transaction);
      
      // For debugging: check if the subscriptionId format is correct
      console.log(`Subscription ID type: ${typeof subscriptionId}, value: ${subscriptionId}`);
      
      // Redirect to payment result page with error
      return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent('Subscription not found')}&subscriptionId=${encodeURIComponent(subscriptionId)}&callbackUrl=${encodeURIComponent(request.url)}`, request.url));
    }
    
    const subscription = subscriptionResults[0];
    
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
  } catch (error) {
    console.error('Error processing payment redirect:', error);
    // Redirect to error page
    return NextResponse.redirect(new URL(`/dashboard/client/subscriptions/payment-result?status=error&message=${encodeURIComponent(error.message)}`, request.url));
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
    // Parse the callback data from Paylink
    const callbackData = await request.json();
    
    console.log('Received Paylink callback:', JSON.stringify(callbackData));
    
    // Extract the invoice ID from the callback data
    const invoiceId = callbackData.invoice_id;
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing invoice ID in callback data' },
        { status: 400 }
      );
    }
    
    // Verify the payment status with Paylink API
    const invoiceDetails = await getInvoice(invoiceId);
    
    // Get the transaction reference from the database
    const transactionResults = await executeQuery(`
      SELECT * FROM payment_transactions 
      WHERE paylink_invoice_id = ?
    `, [invoiceId]);
    
    if (!transactionResults.length) {
      return NextResponse.json(
        { error: 'Transaction not found for the given invoice ID' },
        { status: 404 }
      );
    }
    
    const transaction = transactionResults[0];
    const subscriptionId = transaction.subscription_id;
    const userId = transaction.user_id;
    
    // Determine the payment status based on Paylink's response
    const paymentStatus = invoiceDetails.paid ? 'completed' : 'pending';
    
    if (invoiceDetails.paid) {
      // Payment was successful
      try {
        // Begin transaction for updating related records
        await executeQuery('START TRANSACTION');
        
        // Update the payment transaction status with Paylink response details
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = ?, payment_gateway_response = ?, updated_at = NOW() 
          WHERE paylink_invoice_id = ?
        `, [paymentStatus, JSON.stringify(invoiceDetails), invoiceId]);
        
        // Get subscription details with user information for email notification
        const subscriptionResults = await executeQuery(`
          SELECT s.*, p.name as plan_name, p.description as plan_description, 
                 u.email as user_email, u.name as user_name, CONCAT(u.first_name, ' ', u.last_name) as full_name
          FROM subscriptions s
          LEFT JOIN subscription_plans p ON s.plan_id = p.id
          LEFT JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `, [subscriptionId]);
        
        if (!subscriptionResults.length) {
          throw new Error(`Subscription not found with ID: ${subscriptionId}`);
        }
        
        const subscription = subscriptionResults[0];
        
        // Update the subscription status to 'active' (automatically activate upon payment)
        await executeQuery(`
          UPDATE subscriptions 
          SET status = 'active', payment_confirmed = TRUE, updated_at = NOW() 
          WHERE id = ?
        `, [subscriptionId]);
        
        // Add subscription history record
        await executeQuery(`
          INSERT INTO subscription_history 
          (id, subscription_id, user_id, action, details, created_at)
          VALUES (UUID(), ?, ?, ?, ?, NOW())
        `, [
          subscriptionId,
          userId,
          'payment_completed',
          JSON.stringify({
            invoiceId,
            paymentMethod: 'paylink',
            amount: transaction.amount,
            transactionId: transaction.transaction_id
          })
        ]);
        
        // Commit all database changes
        await executeQuery('COMMIT');
        
        // Log payment details
        console.log(`Payment successful for invoice ${invoiceId}, subscription ${subscriptionId} has been activated`);
        
        // Send confirmation email to user
        try {
          const userName = subscription.user_name || subscription.full_name || 'Valued Customer';
          
          if (subscription.user_email) {
            await sendSubscriptionEmail({
              type: 'payment_confirmation',
              email: subscription.user_email,
              name: userName,
              subscription: {
                id: subscription.id,
                planName: subscription.plan_name || 'Subscription Plan',
                amount: transaction.amount,
                startDate: subscription.started_date,
                expiryDate: subscription.expired_date,
                transactionId: transaction.transaction_id
              }
            });
            console.log(`Payment confirmation email sent to ${subscription.user_email}`);
          } else {
            console.log('User email not found, skipping payment confirmation email');
          }
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Non-critical error, continue with the process
        }
        
        // Return success response
        return NextResponse.json({
          success: true,
          message: 'Payment processed successfully',
          invoiceId,
          transactionId: transaction.transaction_id,
          subscriptionId,
          status: paymentStatus,
          subscription: {
            id: subscriptionId,
            status: 'active'
          }
        });
      } catch (dbError) {
        // If any error occurs, rollback the transaction
        try {
          await executeQuery('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
        
        console.error('Database error during payment processing:', dbError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database error during payment processing',
            message: dbError.message 
          },
          { status: 500 }
        );
      }
    } else {
      // Payment is pending or failed
      try {
        // Determine more specific status based on Paylink response
        let detailedStatus = 'pending';
        
        // If the invoice has an explicit status, use it
        if (invoiceDetails.status) {
          if (invoiceDetails.status.toLowerCase() === 'canceled' || 
              invoiceDetails.status.toLowerCase() === 'cancelled') {
            detailedStatus = 'cancelled';
          } else if (invoiceDetails.status.toLowerCase() === 'failed' || 
                     invoiceDetails.status.toLowerCase() === 'rejected') {
            detailedStatus = 'failed';
          }
        }
        
        // Update the payment transaction status with more details
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = ?, payment_gateway_response = ?, updated_at = NOW() 
          WHERE paylink_invoice_id = ?
        `, [detailedStatus, JSON.stringify(invoiceDetails), invoiceId]);
        
        // Update subscription status if payment failed or was cancelled
        if (detailedStatus === 'failed' || detailedStatus === 'cancelled') {
          await executeQuery(`
            UPDATE subscriptions 
            SET status = ?, updated_at = NOW() 
            WHERE id = ? AND status = 'pending'
          `, [detailedStatus, subscriptionId]);
          
          // Add subscription history record
          await executeQuery(`
            INSERT INTO subscription_history 
            (id, subscription_id, user_id, action, details, created_at)
            VALUES (UUID(), ?, ?, ?, ?, NOW())
          `, [
            subscriptionId,
            userId,
            `payment_${detailedStatus}`,
            JSON.stringify({
              invoiceId,
              paymentMethod: 'paylink',
              reason: invoiceDetails.status || detailedStatus
            })
          ]);
          
          // Get user email to notify about payment failure
          const userResults = await executeQuery(`
            SELECT u.email, u.name, CONCAT(u.first_name, ' ', u.last_name) as full_name
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE s.id = ?
          `, [subscriptionId]);
          
          if (userResults.length > 0 && userResults[0].email) {
            try {
              const userName = userResults[0].name || userResults[0].full_name || 'Valued Customer';
              
              // Send payment failure notification
              await sendSubscriptionEmail({
                type: 'payment_failed',
                email: userResults[0].email,
                name: userName,
                subscription: {
                  id: subscriptionId,
                  status: detailedStatus,
                  reason: invoiceDetails.message || 'Payment was not completed successfully'
                }
              });
            } catch (emailError) {
              console.error('Failed to send payment failure email:', emailError);
              // Non-critical error, continue with the process
            }
          }
          
          console.log(`Payment ${detailedStatus} for invoice ${invoiceId}, subscription ${subscriptionId}`);
        } else {
          console.log(`Payment still pending for invoice ${invoiceId}, subscription ${subscriptionId}`);
        }
        
        // Return response with detailed status
        return NextResponse.json({
          success: true,
          message: `Payment status updated to ${detailedStatus}`,
          invoiceId,
          transactionId: transaction.transaction_id,
          subscriptionId,
          status: detailedStatus
        });
      } catch (dbError) {
        console.error('Database error updating payment status:', dbError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database error updating payment status',
            message: dbError.message 
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error processing Paylink callback:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment callback',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
