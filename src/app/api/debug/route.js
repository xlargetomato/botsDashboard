import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

export async function GET(request) {
  try {
    // Get all subscription plans
    const plansResult = await executeQuery(
      `SELECT * FROM subscription_plans`
    );
    
    // Get sample subscription with associated plan
    const subscriptionResult = await executeQuery(
      `SELECT s.*, sp.name as plan_name 
       FROM subscriptions s
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       LIMIT 5`
    );
    
    // Log column info for subscription plans
    const planColumnsResult = await executeQuery(
      `SHOW COLUMNS FROM subscription_plans`
    );
    
    return NextResponse.json({
      plans: plansResult,
      subscriptions: subscriptionResult,
      planColumns: planColumnsResult,
      message: 'Debug information fetched successfully'
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Error fetching debug information',
        message: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
