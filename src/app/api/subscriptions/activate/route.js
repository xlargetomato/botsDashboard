import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

// PUT handler to activate a subscription (change status from 'available' to 'active')
export async function PUT(request) {
  try {
    // Get the subscription ID from the request body
    const { subscriptionId } = await request.json();
    
    // Validate subscription ID
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }
    
    // Verify authentication
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Check if the subscription exists and belongs to the user
    const subscriptions = await executeQuery(
      'SELECT * FROM subscriptions WHERE id = ? AND user_id = ?',
      [subscriptionId, userId]
    );
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found or does not belong to the user' },
        { status: 404 }
      );
    }
    
    const subscription = subscriptions[0];
    
    // Check if the subscription is in 'available' status
    if (subscription.status !== 'available') {
      return NextResponse.json(
        { error: 'Only available subscriptions can be activated' },
        { status: 400 }
      );
    }
    
    // Update the subscription status to 'active' (meaning user is using it)
    await executeQuery(
      'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ?',
      ['active', subscriptionId]
    );
    
    return NextResponse.json(
      { 
        message: 'Subscription activated successfully',
        subscriptionId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error activating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to activate subscription' },
      { status: 500 }
    );
  }
}
