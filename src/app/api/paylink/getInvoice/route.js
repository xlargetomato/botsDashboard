import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';

/**
 * GET handler to verify payment status of an invoice
 * This endpoint allows checking the current status of a payment
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the invoice ID from query parameters
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('invoiceId');
    const transactionId = url.searchParams.get('transactionId');
    
    if (!invoiceId && !transactionId) {
      return NextResponse.json(
        { error: 'Missing invoice ID or transaction ID' },
        { status: 400 }
      );
    }
    
    // Query based on invoice ID or transaction ID
    let transactionResults;
    if (invoiceId) {
      transactionResults = await executeQuery(`
        SELECT * FROM payment_transactions 
        WHERE paylink_invoice_id = ?
      `, [invoiceId]);
    } else {
      transactionResults = await executeQuery(`
        SELECT * FROM payment_transactions 
        WHERE transaction_id = ?
      `, [transactionId]);
    }
    
    if (!transactionResults.length) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    const transaction = transactionResults[0];
    
    // Get current user ID
    const userId = authResult.userId;
    
    // Verify that the transaction belongs to the authenticated user
    if (transaction.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this transaction' },
        { status: 403 }
      );
    }
    
    // Get subscription details
    const subscriptionResults = await executeQuery(`
      SELECT s.*, p.name as plan_name, p.description as plan_description
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `, [transaction.subscription_id]);
    
    // Check invoice status directly from Paylink.sa
    let invoiceDetails;
    try {
      const invoiceIdToCheck = transaction.paylink_invoice_id;
      invoiceDetails = await getInvoice(invoiceIdToCheck);
      
      // Update our database with the latest status from Paylink
      if (invoiceDetails.paid && transaction.status !== 'completed') {
        // Update transaction status
        await executeQuery(`
          UPDATE payment_transactions 
          SET status = 'completed', updated_at = NOW() 
          WHERE id = ?
        `, [transaction.id]);
        
        // Update subscription status to available
        await executeQuery(`
          UPDATE subscriptions 
          SET status = 'available', updated_at = NOW() 
          WHERE id = ?
        `, [transaction.subscription_id]);
        
        // Update transaction object for response
        transaction.status = 'completed';
      }
    } catch (error) {
      console.error(`Error fetching invoice details from Paylink: ${error.message}`);
      // Continue with local data if Paylink API call fails
    }
    
    // Return transaction and subscription details
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        invoiceId: transaction.paylink_invoice_id,
        amount: transaction.amount,
        status: transaction.status,
        paymentMethod: transaction.payment_method,
        createdAt: transaction.created_at
      },
      subscription: subscriptionResults.length > 0 ? {
        id: subscriptionResults[0].id,
        planName: subscriptionResults[0].plan_name,
        planDescription: subscriptionResults[0].plan_description,
        subscriptionType: subscriptionResults[0].subscription_type,
        startedDate: subscriptionResults[0].started_date,
        expiredDate: subscriptionResults[0].expired_date,
        status: subscriptionResults[0].status
      } : null,
      paylinkDetails: invoiceDetails || null
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify payment',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
