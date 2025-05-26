import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
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
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Get total users count
    const usersResult = await executeQuery('SELECT COUNT(*) as count FROM users');
    const totalUsers = usersResult[0].count;

    // Get active subscriptions count
    const activeSubscriptionsResult = await executeQuery(
      'SELECT COUNT(*) as count FROM subscriptions WHERE status = ?',
      ['active']
    );
    const activeSubscriptions = activeSubscriptionsResult[0].count;

    // Get total revenue
    const revenueResult = await executeQuery(
      'SELECT SUM(amount_paid) as total FROM subscriptions'
    );
    const totalRevenue = revenueResult[0].total || 0;

    // Get active coupons count
    const couponsResult = await executeQuery(
      'SELECT COUNT(*) as count FROM promo_codes WHERE is_active = ? AND valid_until > NOW()',
      [true]
    );
    const activeCoupons = couponsResult[0].count;

    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      activeCoupons
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
