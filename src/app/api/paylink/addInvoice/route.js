import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';
import { createInvoice, generateReferenceNumber, formatAmount } from '@/lib/paylink/api';
import PAYLINK_CONFIG from '@/lib/paylink/config';

/**
 * POST handler to create a new invoice in Paylink.sa
 * It uses real subscription data from the user's selected plan
 */
export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    
    // Get request data - containing subscriptionId and any custom items
    const requestData = await request.json();
    const { subscriptionId, callbackUrl } = requestData;
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required subscription ID' },
        { status: 400 }
      );
    }
    
    // Log the request for debugging
    console.log('Processing Paylink invoice request:', { subscriptionId, userId });
    
    // Get subscription details from database
    let subscriptionResults;
    try {
      subscriptionResults = await executeQuery(`
        SELECT s.*, p.name as plan_name, p.description as plan_description
        FROM subscriptions s
        LEFT JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.id = ?
      `, [subscriptionId]);
      
      console.log('Subscription query results:', subscriptionResults);
      
      if (!subscriptionResults.length) {
        // Try again with just the ID to check if subscription exists at all
        const checkSubscription = await executeQuery('SELECT id, user_id FROM subscriptions WHERE id = ?', [subscriptionId]);
        console.log('Subscription existence check:', checkSubscription);
        
        if (checkSubscription.length) {
          console.log('Subscription exists but belongs to different user:', { 
            foundUserId: checkSubscription[0].user_id,
            requestUserId: userId 
          });
          return NextResponse.json(
            { error: 'Subscription belongs to a different user' },
            { status: 403 }
          );
        } else {
          console.log('Subscription not found with ID:', subscriptionId);
          return NextResponse.json(
            { error: 'Subscription not found with the provided ID' },
            { status: 404 }
          );
        }
      }
      
      // Since we found the subscription, let's check if it belongs to the user
      if (subscriptionResults[0].user_id !== userId) {
        console.log('User ID mismatch:', { 
          subscriptionUserId: subscriptionResults[0].user_id, 
          requestUserId: userId 
        });
        return NextResponse.json(
          { error: 'Subscription does not belong to authenticated user' },
          { status: 403 }
        );
      }
    } catch (dbError) {
      console.error('Database error when fetching subscription:', dbError);
      return NextResponse.json(
        { error: 'Database error when fetching subscription', details: dbError.message },
        { status: 500 }
      );
    }
    
    const subscription = subscriptionResults[0];
    
    // Get user details from database
    const userResults = await executeQuery(`
      SELECT * FROM users WHERE id = ?
    `, [userId]);
    
    if (!userResults.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const user = userResults[0];
    
    // Generate a unique reference number for the invoice
    const referenceNumber = generateReferenceNumber();
    
    // Calculate amount based on subscription details
    // Ensure amount_paid is a valid number before formatting
    if (subscription.amount_paid === undefined || subscription.amount_paid === null) {
      console.error('Missing amount_paid in subscription:', subscription);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid subscription amount',
          message: 'Subscription amount is missing or invalid' 
        },
        { status: 400 }
      );
    }
    
    // Log the amount for debugging
    console.log('Processing amount:', subscription.amount_paid, typeof subscription.amount_paid);
    
    const amount = formatAmount(subscription.amount_paid);
    
    // Prepare the invoice data for Paylink.sa
    const invoiceData = {
      amount: amount,
      callBackUrl: callbackUrl || PAYLINK_CONFIG.DEFAULT_CALLBACK_URL,
      clientEmail: user.email,
      clientName: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Client',
      clientPhone: user.phone || '',
      currencyCode: PAYLINK_CONFIG.CURRENCY,
      orderNumber: referenceNumber,
      products: [
        {
          description: subscription.plan_description || `${subscription.plan_name} - ${subscription.subscription_type} subscription`,
          price: amount,
          qty: 1,
          title: subscription.plan_name || 'Subscription'
        }
      ]
    };
    
    // Create the invoice in Paylink.sa
    const invoiceResponse = await createInvoice(invoiceData);
    
    // Store the Paylink invoice details in the database
    await executeQuery(`
      INSERT INTO payment_transactions 
      (id, user_id, subscription_id, amount, payment_method, transaction_id, status, paylink_invoice_id, paylink_reference)
      VALUES (UUID(), ?, ?, ?, 'paylink', ?, 'pending', ?, ?)
    `, [
      userId,
      subscriptionId,
      amount,
      referenceNumber,
      invoiceResponse.id,
      referenceNumber
    ]);
    
    // Update the subscription with the Paylink reference
    await executeQuery(`
      UPDATE subscriptions 
      SET transaction_id = ?, status = 'pending', updated_at = NOW()
      WHERE id = ?
    `, [referenceNumber, subscriptionId]);
    
    return NextResponse.json({
      success: true,
      invoiceId: invoiceResponse.id,
      transactionId: referenceNumber,
      paymentUrl: invoiceResponse.url,
      invoiceDetails: invoiceResponse
    });
  } catch (error) {
    console.error('Error creating Paylink invoice:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create invoice',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
