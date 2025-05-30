import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

/**
 * POST handler to update subscription status
 * This is used when payment processing fails or succeeds
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
    
    // Get request data
    const { subscriptionId, status, reason } = await request.json();
    
    if (!subscriptionId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate status values
    const validStatuses = ['active', 'pending', 'cancelled', 'failed', 'expired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    // Check if the subscription exists
    const subscriptionResult = await executeQuery(
      'SELECT id, user_id, status FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );
    
    if (!subscriptionResult.length) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    // Check if the user owns the subscription or is an admin
    if (subscriptionResult[0].user_id !== authResult.userId && authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update this subscription' },
        { status: 403 }
      );
    }
    
    // Update the subscription status
    await executeQuery(
      'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, subscriptionId]
    );
    
    // Add entry to subscription history
    await executeQuery(
      `INSERT INTO subscription_history 
       (id, subscription_id, user_id, action, details, created_at)
       VALUES (UUID(), ?, ?, ?, ?, NOW())`,
      [
        subscriptionId,
        authResult.userId,
        `status_change_to_${status}`,
        JSON.stringify({
          previous_status: subscriptionResult[0].status,
          new_status: status,
          reason: reason || 'Manual status update'
        })
      ]
    );
    
    // Also update payment transactions if they exist
    await executeQuery(
      'UPDATE payment_transactions SET status = ? WHERE subscription_id = ? AND status = "pending"',
      [status === 'active' ? 'completed' : status, subscriptionId]
    );
    
    return NextResponse.json({
      success: true,
      message: `Subscription status updated to ${status}`,
      subscriptionId
    });
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription status' },
      { status: 500 }
    );
  }
}
