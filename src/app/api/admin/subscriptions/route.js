import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Check for admin access
    const isAdminRequest = request.headers.get('x-admin-access') === 'true';
    
    // Try to verify authentication
    let isAdmin = false;
    
    try {
      const authResult = await verifyAdminAuth();
      if (authResult.success) {
        isAdmin = true;
      } else if (isAdminRequest) {
        // For development, allow admin requests without auth
        isAdmin = true;
        console.log('Admin request without auth (for development)');
      } else {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      
      // For development, allow admin requests without auth
      if (isAdminRequest) {
        isAdmin = true;
        console.log('Admin request with auth error (for development)');
      } else {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
    }
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Fetch all subscriptions with user and plan details
    const subscriptions = await executeQuery(`
      SELECT 
        s.*,
        u.name as user_name,
        u.email as user_email,
        sp.name as plan_name,
        sp.description as plan_description
      FROM 
        subscriptions s
      LEFT JOIN 
        users u ON s.user_id = u.id
      LEFT JOIN 
        subscription_plans sp ON s.plan_id = sp.id
      ORDER BY 
        s.created_at DESC
    `);
    
    // Format dates for consistent response
    const formattedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      created_at: sub.created_at ? new Date(sub.created_at).toISOString() : null,
      updated_at: sub.updated_at ? new Date(sub.updated_at).toISOString() : null,
      start_date: sub.start_date ? new Date(sub.start_date).toISOString() : null,
      end_date: sub.end_date ? new Date(sub.end_date).toISOString() : null
    }));
    
    return NextResponse.json(formattedSubscriptions);
  } catch (error) {
    console.error('Error in admin subscriptions API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
