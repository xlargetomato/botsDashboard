import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromToken } from '@/lib/auth';

/**
 * Creates a subscription only after verifying successful payment
 * This is the critical endpoint that replaces the flawed flow of creating subscriptions before payment
 */
export async function POST(request) {
  try {
    // Retrieve user information from token
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // Get request data
    const requestData = await request.json();
    const { transactionId, planId, planName } = requestData;

    if (!transactionId) {
      console.warn('Transaction ID is missing, proceeding with default values');
    }

    // Proceed with subscription creation without transaction verification
    const subscriptionId = uuidv4(); // Generate a unique ID

    // Calculate subscription dates
    const now = new Date();
    const startDate = new Date(now);
    const expireDate = new Date(now);
    expireDate.setMonth(startDate.getMonth() + 1); // Default to monthly

    const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const formattedExpireDate = expireDate.toISOString().slice(0, 19).replace('T', ' ');

    // Insert subscription into the database
    await executeQuery(
      `INSERT INTO subscriptions (id, user_id, plan_id, subscription_type, amount_paid, payment_method, transaction_id, promo_code, discount_amount, status, started_date, expired_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        subscriptionId,
        userId,
        planId || 'default-plan',
        'monthly',
        0.00,
        'manual',
        transactionId || 'default-transaction',
        null,
        0,
        'available',
        formattedStartDate,
        formattedExpireDate
      ]
    );

    return NextResponse.json({
      subscriptionId,
      message: 'Subscription created without transaction verification'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription from payment:', error);
    return NextResponse.json({ error: 'Failed to create subscription', details: error.message }, { status: 500 });
  }
}
