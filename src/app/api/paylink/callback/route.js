import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';

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
      
      // Update the payment transaction status
      await executeQuery(`
        UPDATE payment_transactions 
        SET status = ?, updated_at = NOW() 
        WHERE paylink_invoice_id = ?
      `, [paymentStatus, invoiceId]);
      
      // Update the subscription status to 'available' (user will need to activate it)
      await executeQuery(`
        UPDATE subscriptions 
        SET status = 'available', updated_at = NOW() 
        WHERE id = ?
      `, [subscriptionId]);
      
      // Log payment details
      console.log(`Payment successful for invoice ${invoiceId}, subscription ${subscriptionId}`);
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        invoiceId,
        transactionId: transaction.transaction_id,
        status: paymentStatus
      });
    } else {
      // Payment is pending or failed
      
      // Update the payment transaction status
      await executeQuery(`
        UPDATE payment_transactions 
        SET status = ?, updated_at = NOW() 
        WHERE paylink_invoice_id = ?
      `, [paymentStatus, invoiceId]);
      
      // Return pending response
      return NextResponse.json({
        success: true,
        message: 'Payment status updated',
        invoiceId,
        transactionId: transaction.transaction_id,
        status: paymentStatus
      });
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
