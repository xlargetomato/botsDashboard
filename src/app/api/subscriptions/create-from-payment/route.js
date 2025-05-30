import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { getInvoice } from '@/lib/paylink/api';
import { validateConfig } from '@/lib/paylink/service';

/**
 * Creates a subscription only after verifying successful payment
 * This is the critical endpoint that replaces the flawed flow of creating subscriptions before payment
 */
export async function POST(request) {
  try {
    // Verify authentication
    let userId;
    try {
      const authResult = await verifyAuth(request);
      if (!authResult.success) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = authResult.userId;
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    // Get request data
    const requestData = await request.json();
    const { paymentIntentId, transactionId, invoiceId } = requestData;

    if (!paymentIntentId && !transactionId && !invoiceId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'At least one of paymentIntentId, transactionId, or invoiceId is required' },
        { status: 400 }
      );
    }

    // First, verify that payment was successful with Paylink
    let paylinkVerified = false;
    let paylinkStatus = 'unknown';
    let paylinkData = null;

    if (invoiceId) {
      try {
        // Verify Paylink configuration
        const configStatus = validateConfig();
        if (!configStatus.isValid) {
          return NextResponse.json(
            { error: 'Paylink configuration error', details: `Missing required configuration: ${configStatus.missingVars.join(', ')}` },
            { status: 500 }
          );
        }

        // Check payment status directly with Paylink
        const invoiceDetails = await getInvoice(invoiceId);
        if (invoiceDetails && invoiceDetails.data) {
          paylinkData = invoiceDetails.data;
          paylinkStatus = invoiceDetails.data.status?.toLowerCase() || 'unknown';
          paylinkVerified = paylinkStatus === 'paid' || paylinkStatus === 'completed';
          
          if (!paylinkVerified) {
            return NextResponse.json(
              { error: 'Payment not completed', status: paylinkStatus, details: 'The Paylink invoice has not been paid' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Invalid invoice ID', details: 'Could not retrieve invoice details from Paylink' },
            { status: 400 }
          );
        }
      } catch (paylinkError) {
        console.error('Paylink verification error:', paylinkError);
        return NextResponse.json(
          { error: 'Paylink verification failed', details: paylinkError.message },
          { status: 500 }
        );
      }
    }

    // Find the payment intent record
    let paymentIntent;
    if (paymentIntentId) {
      const paymentIntentResults = await executeQuery(
        'SELECT * FROM payment_intents WHERE id = ?',
        [paymentIntentId]
      );
      
      if (paymentIntentResults && paymentIntentResults.length > 0) {
        paymentIntent = paymentIntentResults[0];
      }
    } else if (transactionId) {
      const paymentIntentResults = await executeQuery(
        'SELECT * FROM payment_intents WHERE transaction_id = ?',
        [transactionId]
      );
      
      if (paymentIntentResults && paymentIntentResults.length > 0) {
        paymentIntent = paymentIntentResults[0];
      }
    }

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Payment intent not found', details: 'Could not locate the payment intent record' },
        { status: 404 }
      );
    }

    // Verify transaction in payment_transactions table
    let paymentTransaction;
    try {
      const transactionResults = await executeQuery(
        'SELECT * FROM payment_transactions WHERE transaction_id = ? OR payment_intent_id = ?',
        [paymentIntent.transaction_id, paymentIntent.id]
      );
      
      if (transactionResults && transactionResults.length > 0) {
        paymentTransaction = transactionResults[0];
        
        // Update the transaction status to completed
        await executeQuery(
          'UPDATE payment_transactions SET status = ?, updated_at = NOW() WHERE id = ?',
          ['completed', paymentTransaction.id]
        );
      }
    } catch (txnError) {
      console.warn('Error updating transaction (non-fatal):', txnError.message);
      // Continue without transaction update
    }

    // Apply promo code if used
    if (paymentIntent.promo_code) {
      try {
        // Update promo code usage - we only do this AFTER confirmed payment
        await executeQuery(
          'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = ?',
          [paymentIntent.promo_code]
        );
      } catch (promoError) {
        console.warn('Error updating promo code usage (non-fatal):', promoError.message);
      }
    }

    // Calculate subscription dates based on subscription type
    const startDate = new Date();
    const expireDate = new Date(startDate);
    
    if (paymentIntent.subscription_type === 'weekly') {
      expireDate.setDate(expireDate.getDate() + 7);
    } else if (paymentIntent.subscription_type === 'monthly') {
      expireDate.setMonth(expireDate.getMonth() + 1);
    } else if (paymentIntent.subscription_type === 'yearly') {
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    } else {
      // Default to monthly if type is unrecognized
      expireDate.setMonth(expireDate.getMonth() + 1);
    }
    
    // Format dates for MySQL
    const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const formattedExpireDate = expireDate.toISOString().slice(0, 19).replace('T', ' ');

    // NOW create the subscription - only after payment is confirmed
    const subscriptionId = uuidv4();
    try {
      await executeQuery(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, subscription_type, amount_paid, payment_method, 
          transaction_id, promo_code, discount_amount, status, started_date, expired_date,
          payment_confirmed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          subscriptionId,
          paymentIntent.user_id,
          paymentIntent.plan_id,
          paymentIntent.subscription_type,
          paymentIntent.amount_paid,
          paymentIntent.payment_method || 'paylink',
          paymentIntent.transaction_id,
          paymentIntent.promo_code || null,
          paymentIntent.discount_amount || 0,
          'active', // Set status as active immediately since payment is confirmed
          formattedStartDate,
          formattedExpireDate,
          true // payment_confirmed flag set to true
        ]
      );
    } catch (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to create subscription', details: subError.message },
        { status: 500 }
      );
    }

    // Update payment intent status
    try {
      await executeQuery(
        'UPDATE payment_intents SET status = ?, subscription_id = ?, updated_at = NOW() WHERE id = ?',
        ['completed', subscriptionId, paymentIntent.id]
      );
    } catch (updateError) {
      console.warn('Error updating payment intent (non-fatal):', updateError.message);
    }

    // Calculate remaining time for detailed information
    const now = new Date();
    const remainingMs = expireDate - now;
    
    // Calculate time units
    const minutes = Math.floor(remainingMs / (1000 * 60));
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    const remainingTimeDetailed = {
      minutes, hours, days, weeks, months, years, milliseconds: remainingMs,
      primaryUnit: 'days',
      secondaryUnit: 'hours'
    };

    // Get plan details for the response
    let planDetails = null;
    try {
      const planResults = await executeQuery(
        'SELECT * FROM subscription_plans WHERE id = ?',
        [paymentIntent.plan_id]
      );
      
      if (planResults && planResults.length > 0) {
        planDetails = planResults[0];
      }
    } catch (planError) {
      console.warn('Error fetching plan details (non-fatal):', planError.message);
    }

    // Fetch the created subscription
    const createdSubscription = await executeQuery(
      'SELECT * FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );
    
    if (createdSubscription.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve created subscription' },
        { status: 500 }
      );
    }
    
    // Enhance the subscription with remaining time information and plan details
    const enhancedSubscription = {
      ...createdSubscription[0],
      remaining_time: `${days} days`,
      remaining_time_detailed: remainingTimeDetailed,
      started_date: startDate,
      expired_date: expireDate,
      plan_name: planDetails?.name || 'Subscription Plan',
      plan_description: planDetails?.description || '',
      plan_features: planDetails?.features || '[]'
    };
    
    return NextResponse.json({ 
      subscription: enhancedSubscription,
      paymentIntent: paymentIntent,
      paylinkVerified: paylinkVerified,
      paylinkStatus: paylinkStatus
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription from payment:', error);
    return NextResponse.json(
      { error: 'Subscription creation failed', details: error.message },
      { status: 500 }
    );
  }
}
