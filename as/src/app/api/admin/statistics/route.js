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
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Get time range from query parameters (default to 'month')
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';

    // Define date range based on timeRange
    let dateCondition;
    switch (timeRange) {
      case 'week':
        dateCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      case 'year':
        dateCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      case 'month':
      default:
        dateCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
    }

    // Get total users count
    const totalUsersResult = await executeQuery('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult[0].count;

    // Get active users count (users with active subscriptions)
    const activeUsersResult = await executeQuery(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM subscriptions 
      WHERE status = 'active'
    `);
    const activeUsers = activeUsersResult[0].count;

    // Get expired accounts count
    const expiredAccountsResult = await executeQuery(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM subscriptions 
      WHERE status = 'expired' 
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s2 
        WHERE s2.user_id = subscriptions.user_id 
        AND s2.status = 'active'
      )
    `);
    const expiredAccounts = expiredAccountsResult[0].count;

    // Get user growth data (new users per period)
    let userGrowthData = [];
    if (timeRange === 'week') {
      // Daily data for the past week
      userGrowthData = await executeQuery(`
        SELECT 
          DATE(created_at) as date, 
          COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) 
        GROUP BY DATE(created_at) 
        ORDER BY date
      `);
    } else if (timeRange === 'year') {
      // Monthly data for the past year
      userGrowthData = await executeQuery(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as date, 
          COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR) 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
        ORDER BY date
      `);
    } else {
      // Weekly data for the past month
      userGrowthData = await executeQuery(`
        SELECT 
          YEARWEEK(created_at) as yearweek, 
          COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
        GROUP BY YEARWEEK(created_at) 
        ORDER BY yearweek
      `);
    }

    // Get subscription trends data
    let subscriptionTrendsData = [];
    if (timeRange === 'week') {
      // Daily data for the past week
      subscriptionTrendsData = await executeQuery(`
        SELECT 
          DATE(created_at) as date, 
          COUNT(*) as count,
          subscription_type
        FROM subscriptions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) 
        GROUP BY DATE(created_at), subscription_type 
        ORDER BY date
      `);
    } else if (timeRange === 'year') {
      // Monthly data for the past year
      subscriptionTrendsData = await executeQuery(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as date, 
          COUNT(*) as count,
          subscription_type
        FROM subscriptions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR) 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m'), subscription_type 
        ORDER BY date
      `);
    } else {
      // Weekly data for the past month
      subscriptionTrendsData = await executeQuery(`
        SELECT 
          YEARWEEK(created_at) as yearweek, 
          COUNT(*) as count,
          subscription_type
        FROM subscriptions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
        GROUP BY YEARWEEK(created_at), subscription_type 
        ORDER BY yearweek
      `);
    }

    // Get plan distribution data
    const planDistributionData = await executeQuery(`
      SELECT 
        sp.name as plan_name, 
        COUNT(s.id) as count 
      FROM subscriptions s 
      JOIN subscription_plans sp ON s.plan_id = sp.id 
      WHERE s.status = 'active' 
      GROUP BY sp.id, sp.name
    `);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      expiredAccounts,
      userGrowth: userGrowthData,
      subscriptionTrends: subscriptionTrendsData,
      planDistribution: planDistributionData
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
