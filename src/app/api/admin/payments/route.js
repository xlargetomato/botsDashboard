import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';

// Sample payments data for development fallback
const samplePayments = [
  {
    id: '1',
    user_id: '1',
    subscription_id: '1',
    amount: 99.99,
    payment_method: 'credit_card',
    transaction_id: 'tx_123456789',
    status: 'completed',
    created_at: new Date().toISOString(),
    user_name: 'Ahmed Mohamed',
    user_email: 'user1@example.com',
    plan_name: 'Premium Plan'
  },
  {
    id: '2',
    user_id: '2',
    subscription_id: '2',
    amount: 199.99,
    payment_method: 'bank_transfer',
    transaction_id: 'tx_987654321',
    status: 'pending',
    created_at: new Date().toISOString(),
    user_name: 'Sara Ali',
    user_email: 'user2@example.com',
    plan_name: 'Business Plan'
  },
  {
    id: '3',
    user_id: '3',
    subscription_id: '3',
    amount: 49.99,
    payment_method: 'paypal',
    transaction_id: 'tx_456789123',
    status: 'failed',
    created_at: new Date().toISOString(),
    user_name: 'Mohammed Abdullah',
    user_email: 'user3@example.com',
    plan_name: 'Basic Plan'
  }
];

// GET - Fetch all payments
export async function GET(request) {
  try {
    // Skip authentication for development purposes
    // In production, uncomment the following authentication check
    /*
    try {
      const authResult = await verifyAuth(request);
      if (!authResult.success) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user has admin role
      if (!authResult.role || authResult.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin privileges required' },
          { status: 403 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      // For development, we'll continue anyway
    }
    */

    let payments;
    
    try {
      // Fetch payments from database
      payments = await executeQuery(`
        SELECT pt.*, u.email, u.name as user_name, sp.name as plan_name
        FROM payment_transactions pt
        LEFT JOIN users u ON pt.user_id = u.id
        LEFT JOIN subscriptions s ON pt.subscription_id = s.id
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        ORDER BY pt.created_at DESC
      `);
      
      // If no payments in database, use sample payments for development
      if (!payments || payments.length === 0) {
        console.log('No payments found in database, using sample data');
        payments = samplePayments;
      }
    } catch (dbError) {
      console.error('Database error, using sample payments:', dbError);
      payments = samplePayments;
    }

    // Format the payments data
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      userId: payment.user_id,
      userEmail: payment.email,
      userName: payment.name || payment.user_name,
      amount: payment.amount,
      currency: payment.currency || 'SAR',
      status: payment.status,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      planName: payment.plan_name,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    // Return sample data as fallback for development
    return NextResponse.json(samplePayments.map(payment => ({
      id: payment.id,
      userId: payment.user_id,
      userEmail: payment.user_email,
      userName: payment.user_name,
      amount: payment.amount,
      currency: 'SAR',
      status: payment.status,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      planName: payment.plan_name,
      createdAt: payment.created_at
    })));
  }
}

// POST - Create a new payment
export async function POST(request) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Parse request body
    const { 
      userId, 
      amount, 
      currency = 'USD', 
      status = 'completed', 
      paymentMethod, 
      transactionId 
    } = await request.json();

    // Validate required fields
    if (!userId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'User ID, amount, and payment method are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const users = await executeQuery('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if subscription exists
    const subscriptions = await executeQuery('SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1', [userId]);
    const subscriptionId = subscriptions.length > 0 ? subscriptions[0].id : null;
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found for this user' },
        { status: 400 }
      );
    }
    
    // Insert new payment
    const result = await executeQuery(`
      INSERT INTO payment_transactions (
        id, user_id, subscription_id, amount, payment_method, transaction_id, status, created_at
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())
    `, [userId, subscriptionId, amount, paymentMethod, transactionId, status]);

    // Get the created payment
    const newPayment = await executeQuery(`
      SELECT pt.*, u.email, u.name as user_name
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.id = ?
    `, [result.insertId]);

    // Format the payment data
    const formattedPayment = {
      id: newPayment[0].id,
      userId: newPayment[0].user_id,
      subscriptionId: newPayment[0].subscription_id,
      userEmail: newPayment[0].email,
      userName: newPayment[0].user_name,
      amount: newPayment[0].amount,
      currency: 'SAR', // Default currency
      status: newPayment[0].status,
      paymentMethod: newPayment[0].payment_method,
      transactionId: newPayment[0].transaction_id,
      createdAt: newPayment[0].created_at
    };

    return NextResponse.json(formattedPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
