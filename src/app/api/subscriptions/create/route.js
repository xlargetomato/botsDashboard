import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getBaseUrl } from '@/lib/utils/url';

/**
 * Create a new subscription
 * POST /api/subscriptions/create
 */
export async function POST(request) {
  try {
    const {
      planId,
      planName,
      amount,
      currency,
      interval,
      customerId,
      customerEmail,
      customerName,
      returnUrl,
      cancelUrl
    } = await request.json();

    // Validate required fields
    if (!planId || !amount || !customerId || !customerEmail) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Generate unique transaction ID
    const transactionId = `SUB-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Create subscription record
    const subscriptionResult = await executeQuery(`
      INSERT INTO subscriptions (
        id,
        plan_id,
        customer_id,
        status,
        amount,
        currency,
        billing_interval,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      transactionId,
      planId,
      customerId,
      'pending',
      amount,
      currency || 'USD',
      interval
    ]);

    if (!subscriptionResult.insertId) {
      throw new Error('Failed to create subscription record');
    }

    // Create payment transaction record
    const transactionResult = await executeQuery(`
      INSERT INTO payment_transactions (
        id,
        subscription_id,
        amount,
        currency,
        status,
        customer_email,
        customer_name,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      transactionId,
      transactionId,
      amount,
      currency || 'USD',
      'pending',
      customerEmail,
      customerName
    ]);

    if (!transactionResult.insertId) {
      throw new Error('Failed to create transaction record');
    }

    // Prepare payment gateway request
    const baseUrl = getBaseUrl(request);
    const paymentData = {
      amount,
      currency: currency || 'USD',
      orderNumber: transactionId,
      transactionNo: transactionId,
      customerEmail,
      customerName,
      planId,
      planName,
      returnUrl: returnUrl || `${baseUrl}/dashboard/client/subscriptions/payment-status`,
      cancelUrl: cancelUrl || `${baseUrl}/dashboard/client/subscriptions/payment-status?status=cancelled`,
      callbackUrl: `${baseUrl}/api/paylink/callback`
    };

    // Call payment gateway API to create payment session
    const paymentResponse = await fetch(process.env.PAYMENT_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYMENT_GATEWAY_API_KEY}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      throw new Error('Failed to create payment session');
    }

    const paymentResult = await paymentResponse.json();

    return NextResponse.json({
      success: true,
      transactionId,
      orderNumber: transactionId,
      transactionNo: transactionId,
      paymentUrl: paymentResult.checkoutUrl || paymentResult.paymentUrl,
      message: 'Payment session created successfully'
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to create subscription'
    }, { status: 500 });
  }
}
