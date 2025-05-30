import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

// GET handler to fetch user's payments
export async function GET(request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get('userId');
    
    // Check for admin access
    const isAdminRequest = request.headers.get('x-admin-access') === 'true';
    
    // Try to verify authentication
    let userId = null;
    let isAdmin = false;
    
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
        isAdmin = authResult.role === 'admin';
        
        // If this is an admin requesting another user's payments
        if (isAdmin && isAdminRequest && requestedUserId) {
          userId = requestedUserId;
          console.log(`Admin requesting payments for user: ${userId}`);
        }
      } else if (isAdminRequest && requestedUserId) {
        // Allow admin requests without auth for development
        userId = requestedUserId;
        isAdmin = true;
        console.log(`Admin request with userId: ${userId} (no auth)`);
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      
      // For development, allow admin requests without auth
      if (isAdminRequest && requestedUserId) {
        userId = requestedUserId;
        isAdmin = true;
        console.log(`Admin request with userId: ${userId} (auth error)`);
      } else {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch payments for the user
    let payments = [];
    try {
      // First try to get payments from the payment_transactions table
      payments = await executeQuery(`
        SELECT 
          pt.*,
          s.plan_id,
          s.subscription_type,
          sp.name as plan_name
        FROM 
          payment_transactions pt
        LEFT JOIN 
          subscriptions s ON pt.subscription_id = s.id
        LEFT JOIN 
          subscription_plans sp ON s.plan_id = sp.id
        WHERE 
          pt.user_id = ?
        ORDER BY 
          pt.created_at DESC
      `, [userId]);
      
      // If no payments found, try the payments table
      if (payments.length === 0) {
        payments = await executeQuery(`
          SELECT 
            p.*,
            u.email,
            u.name as user_name,
            sp.name as plan_name
          FROM 
            payments p
          LEFT JOIN 
            users u ON p.user_id = u.id
          LEFT JOIN 
            subscription_plans sp ON p.plan_id = sp.id
          WHERE 
            p.user_id = ?
          ORDER BY 
            p.created_at DESC
        `, [userId]);
      }
      
      // Format payments for consistent response
      const formattedPayments = payments.map(payment => ({
        id: payment.id,
        user_id: payment.user_id,
        userId: payment.user_id,
        userEmail: payment.email,
        userName: payment.user_name || payment.name,
        amount: parseFloat(payment.amount),
        currency: payment.currency || 'SAR',
        status: payment.status,
        paymentMethod: payment.payment_method || payment.method,
        method: payment.payment_method || payment.method,
        transactionId: payment.transaction_id,
        planName: payment.plan_name || 'Unknown Plan',
        subscriptionId: payment.subscription_id,
        createdAt: payment.created_at,
        date: payment.created_at,
        updatedAt: payment.updated_at
      }));
      
      return NextResponse.json({ payments: formattedPayments });
    } catch (dbError) {
      console.error('Database error when fetching payments:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch payments', details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
