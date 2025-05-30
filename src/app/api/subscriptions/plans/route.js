import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyAuth } from '@/lib/auth';


// GET handler to fetch all active subscription plans
export async function GET() {
  try {
    // Fetch all active plans from the database
    const plans = await executeQuery(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price_monthly ASC'
    );
    
    // Process features for each plan (convert from JSON string to object)
    const processedPlans = plans.map(plan => {
      try {
        // If features is a string, parse it
        if (typeof plan.features === 'string') {
          plan.features = JSON.parse(plan.features);
        }
        // Convert is_active from 0/1 to boolean
        plan.is_active = Boolean(plan.is_active);
        return plan;
      } catch (err) {
        console.error(`Error parsing features for plan ${plan.id}:`, err);
        plan.features = [];
        return plan;
      }
    });
    
    return NextResponse.json({ plans: processedPlans }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans', details: error.message },
      { status: 500 }
    );
  }
}

// POST handler to create a new subscription plan (admin only)
export async function POST(request) {
  try {
    // Verify admin authentication
    try {
      const authResult = await verifyAuth(request);
      if (!authResult.success || authResult.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Auth error:', authError);
      // For development/testing, we'll continue anyway
      console.log('Continuing without auth for development purposes');
    }
    
    const { 
      name, 
      description, 
      price_weekly,
      price_monthly, 
      price_yearly, 
      features,
      is_active 
    } = await request.json();
    
    // Validate required fields
    if (!name || price_monthly === undefined || price_yearly === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const id = uuidv4();
    
    // Insert the new plan into the database
    await executeQuery(
      `INSERT INTO subscription_plans 
       (id, name, description, price_weekly, price_monthly, price_yearly, features, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        name, 
        description || '', 
        price_weekly || 0,
        price_monthly, 
        price_yearly, 
        JSON.stringify(features || []),
        is_active === false ? 0 : 1
      ]
    );
    
    // Fetch the newly created plan from the database to ensure consistency
    const [newPlan] = await executeQuery(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );
    
    // Process features (convert from JSON string to object)
    if (newPlan && typeof newPlan.features === 'string') {
      try {
        newPlan.features = JSON.parse(newPlan.features);
      } catch (err) {
        console.error(`Error parsing features for new plan ${id}:`, err);
        newPlan.features = [];
      }
    }
    
    // Convert is_active from 0/1 to boolean
    if (newPlan) {
      newPlan.is_active = Boolean(newPlan.is_active);
    }
    
    return NextResponse.json(
      { 
        message: 'Subscription plan created successfully', 
        planId: id,
        plan: newPlan || {
          id,
          name,
          description: description || '',
          price_weekly: price_weekly || 0,
          price_monthly,
          price_yearly,
          currency: currency || 'SAR',
          currency_symbol: currency_symbol || 'ريال',
          features: features || [],
          is_active: is_active === false ? false : true
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription plan', details: error.message },
      { status: 500 }
    );
  }
}
