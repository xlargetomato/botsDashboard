import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

export async function GET(request) {
  try {
    // Get user ID from request headers (set by middleware)
    const headers = new Headers(request.headers);
    const userId = headers.get('x-user-id');
    
    // The middleware will handle unauthorized requests, but we'll add a check just in case
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active and available subscriptions with available bot slots
    const subscriptions = await executeQuery(`
      SELECT 
        s.id as subscription_id,
        s.plan_id,
        sp.name as plan_name,
        sp.max_bots_allowed as slots_total,
        DATEDIFF(s.expired_date, NOW()) as days_left,
        (
          SELECT COUNT(*) 
          FROM whatsapp_bots wb 
          WHERE wb.subscription_id = s.id
        ) as slots_used,
        s.status
      FROM subscriptions s
      INNER JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE 
        s.user_id = ?
        AND s.expired_date > NOW()
        AND s.status IN ( 'available')
        AND (
          SELECT COUNT(*) 
          FROM whatsapp_bots wb 
          WHERE wb.subscription_id = s.id
        ) < sp.max_bots_allowed
      ORDER BY s.expired_date ASC
    `, [userId]);

    // Format the response
    const formattedSubscriptions = subscriptions.map(sub => ({
      subscription_id: sub.subscription_id,
      plan_name: sub.plan_name,
      days_left: Math.max(0, sub.days_left), // Ensure days_left is not negative
      slots_used: parseInt(sub.slots_used, 10),
      slots_total: sub.slots_total,
      status: sub.status
    }));

    // Add debug headers in development
    const response = NextResponse.json(formattedSubscriptions);
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('x-debug-user-id', userId);
    }

    return response;
  } catch (error) {
    console.error('Error fetching active subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 