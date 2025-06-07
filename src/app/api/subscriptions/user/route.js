import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { createSubscriptionsTable } from '@/lib/db/migrations/subscriptions';


// GET handler to fetch user's subscriptions
export async function GET(request) {
  try {
    // Check if a specific subscription ID or user ID is requested
    const url = new URL(request.url);
    const subscriptionId = url.searchParams.get('id');
    const requestedUserId = url.searchParams.get('userId');
    
    // Check for admin access
    const isAdminRequest = request.headers.get('x-admin-access') === 'true';
    
    // Try to verify authentication, but don't fail if it doesn't work
    let userId = 'user-1'; // Default for testing
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
        
        // If this is an admin requesting another user's subscriptions
        if (isAdminRequest && requestedUserId && authResult.role === 'admin') {
          userId = requestedUserId;
          console.log(`Admin requesting subscriptions for user: ${userId}`);
        }
      }
    } catch (authError) {
      console.error('Auth error, using default user:', authError);
      
      // If this is an admin request with a userId, allow it even without auth
      if (isAdminRequest && requestedUserId) {
        userId = requestedUserId;
        console.log(`Admin request with userId: ${userId} (no auth)`);
      }
    }
    
    let subscriptions = [];
    
    try {
      // Try to ensure the subscriptions table exists without failing if there's an issue
      try {
        await createSubscriptionsTable();
      } catch (tableError) {
        console.error('Error creating subscriptions table, continuing anyway:', tableError);
      }
      
      // Fetch subscriptions from the database based on user ID
      if (subscriptionId) {
        // Fetch a specific subscription if ID is provided
        subscriptions = await executeQuery(
          `SELECT s.*, p.name as plan_name, p.description as plan_description, p.features as plan_features 
           FROM subscriptions s 
           LEFT JOIN subscription_plans p ON s.plan_id = p.id 
           WHERE s.id = ?`,
          [subscriptionId]
        );
      } else {
        // Fetch all subscriptions for the user
        subscriptions = await executeQuery(
          `SELECT s.*, p.name as plan_name, p.description as plan_description, p.features as plan_features 
           FROM subscriptions s 
           LEFT JOIN subscription_plans p ON s.plan_id = p.id 
           WHERE s.user_id = ? 
           ORDER BY s.created_at DESC`,
          [userId]
        );
      }
    } catch (dbError) {
      console.error('Database error when fetching subscriptions:', dbError);
      // Log the specific error for debugging
      console.log('Specific DB error:', dbError.message);
    }
    

    
    // Calculate remaining time for each subscription
    const now = new Date();
    const enhancedSubscriptions = subscriptions.map(sub => {
      // Initialize variables
      let remainingTime = '';
      let remainingTimeDetailed = {};
      let status = sub.status;
      let remainingMs = 0;
      
      // Only calculate remaining time if subscription is active or available and has valid dates
      if ((status === 'active' || status === 'available') && sub.expired_date && sub.started_date) {
        const expiredDate = new Date(sub.expired_date);
        remainingMs = expiredDate - now;
      } else if (status === 'pending' || status === 'payment_failed' || !sub.expired_date) {
        // For pending or failed payments, don't calculate remaining time
        remainingMs = 0;
      }
      
      if (remainingMs <= 0) {
        status = 'expired';
        remainingTime = '0';
        remainingTimeDetailed = { 
          minutes: 0,
          hours: 0,
          days: 0,
          weeks: 0,
          months: 0,
          years: 0,
          milliseconds: 0,
          value: 0, 
          unit: 'days' 
        };
      } else {
        // Calculate time units
        const minutes = Math.floor(remainingMs / (1000 * 60));
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);
        
        // Store detailed time information
        remainingTimeDetailed = {
          minutes,
          hours,
          days,
          weeks,
          months,
          years,
          milliseconds: remainingMs
        };
        
        // Format the remaining time string based on the largest unit
        if (years > 0) {
          const remainingMonths = Math.floor((days % 365) / 30);
          remainingTime = `${years} ${years === 1 ? 'year' : 'years'}`;
          if (remainingMonths > 0) {
            remainingTime += ` ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
          }
          remainingTimeDetailed.primaryUnit = 'years';
          remainingTimeDetailed.secondaryUnit = 'months';
        } else if (months > 0) {
          const remainingWeeks = Math.floor((days % 30) / 7);
          remainingTime = `${months} ${months === 1 ? 'month' : 'months'}`;
          if (remainingWeeks > 0) {
            remainingTime += ` ${remainingWeeks} ${remainingWeeks === 1 ? 'week' : 'weeks'}`;
          }
          remainingTimeDetailed.primaryUnit = 'months';
          remainingTimeDetailed.secondaryUnit = 'weeks';
        } else if (weeks > 0) {
          const remainingDays = days % 7;
          remainingTime = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
          if (remainingDays > 0) {
            remainingTime += ` ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
          }
          remainingTimeDetailed.primaryUnit = 'weeks';
          remainingTimeDetailed.secondaryUnit = 'days';
        } else if (days > 0) {
          const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          remainingTime = `${days} ${days === 1 ? 'day' : 'days'}`;
          if (remainingHours > 0) {
            remainingTime += ` ${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`;
          }
          remainingTimeDetailed.primaryUnit = 'days';
          remainingTimeDetailed.secondaryUnit = 'hours';
        } else {
          const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          remainingTime = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
          if (remainingMinutes > 0) {
            remainingTime += ` ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
          }
          remainingTimeDetailed.primaryUnit = 'hours';
          remainingTimeDetailed.secondaryUnit = 'minutes';
        }
      }
      
      // Ensure we have proper date objects for start and expiry
      const formattedStartDate = sub.started_date ? new Date(sub.started_date) : null;
      const formattedExpiredDate = sub.expired_date ? new Date(sub.expired_date) : null;
      
      return {
        ...sub,
        status,
        remaining_time: remainingTime,
        remaining_time_detailed: remainingTimeDetailed,
        started_date: formattedStartDate,
        expired_date: formattedExpiredDate
      };
    });
    
    return NextResponse.json({ subscriptions: enhancedSubscriptions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return NextResponse.json(
      { subscriptions: sampleSubscriptions },
      { status: 200 }
    );
  }
}

// POST handler to create a payment intent - NOT an actual subscription yet
export async function POST(request) {
  try {
    // Verify authentication
    let userId = 'user-1'; // Default for testing
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      } else {
        console.log('Auth not successful, using default user');
      }
    } catch (authError) {
      console.error('Auth error, using default user:', authError);
    }
    
    const { 
      planId, 
      subscriptionType, 
      amountPaid, 
      paymentMethod,
      transactionId,
      promoCode
    } = await request.json();
    
    // Validate required fields
    if (!planId || !subscriptionType || !amountPaid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Apply promo code if provided
    let discountAmount = 0;
    if (promoCode) {
      try {
        const promoResult = await executeQuery(
          'SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()',
          [promoCode]
        );
        
        if (promoResult.length > 0) {
          const promo = promoResult[0];
          
          // Check if max uses is reached
          if (promo.max_uses === null || promo.current_uses < promo.max_uses) {
            // Calculate discount
            if (promo.discount_type === 'percentage') {
              discountAmount = (amountPaid * promo.discount_value) / 100;
            } else {
              discountAmount = promo.discount_value;
            }
            
            // We'll update promo code usage only AFTER payment is confirmed
          }
        }
      } catch (promoError) {
        console.error('Error processing promo code:', promoError);
        // Continue without applying promo code
      }
    }
    
    // Generate unique IDs
    const paymentIntentId = uuidv4();
    const transactionIdToUse = transactionId || `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Create payment intent in payment_intents table
    try {
      // First check if the table exists
      const tableExists = await executeQuery(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_intents'"
      );
      
      // Create table if it doesn't exist
      if (!tableExists || tableExists.length === 0) {
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS payment_intents (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            plan_id VARCHAR(36) NOT NULL,
            subscription_type VARCHAR(20) NOT NULL,
            amount_paid DECIMAL(10,2) NOT NULL,
            discount_amount DECIMAL(10,2) DEFAULT 0,
            payment_method VARCHAR(50),
            transaction_id VARCHAR(100),
            promo_code VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            expires_at DATETIME,
            payment_data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
      }
      
      // Store the payment intent
      await executeQuery(
        `INSERT INTO payment_intents (
          id, user_id, plan_id, subscription_type, amount_paid, discount_amount,
          payment_method, transaction_id, promo_code, status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
        `,
        [
          paymentIntentId,
          userId,
          planId,
          subscriptionType,
          amountPaid,
          discountAmount,
          paymentMethod || 'paylink',
          transactionIdToUse,
          promoCode || null,
          'pending'
        ]
      );
    } catch (dbError) {
      console.error('Error creating payment intent:', dbError);
      return NextResponse.json(
        { error: 'Failed to create payment intent', details: dbError.message },
        { status: 500 }
      );
    }
    
    // Record payment transaction as pending
    try {
      await executeQuery(
        `INSERT INTO payment_transactions 
         (id, user_id, amount, payment_method, transaction_id, status, payment_intent_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), 
          userId, 
          amountPaid - discountAmount, 
          paymentMethod || 'paylink', 
          transactionIdToUse, 
          'pending',
          paymentIntentId
        ]
      );
    } catch (txnError) {
      console.warn('Error recording payment transaction (non-fatal):', txnError.message);
      // Non-fatal error, continue
    }
    
    // Get plan details for the response
    let planDetails = null;
    try {
      const planResults = await executeQuery(
        'SELECT * FROM subscription_plans WHERE id = ?',
        [planId]
      );
      
      if (planResults && planResults.length > 0) {
        planDetails = planResults[0];
      }
    } catch (planError) {
      console.warn('Error fetching plan details (non-fatal):', planError.message);
    }
    
    // Return the payment intent details
    const paymentIntent = {
      id: paymentIntentId,
      transactionId: transactionIdToUse,
      planId: planId,
      planName: planDetails?.name || 'Subscription Plan',
      planDescription: planDetails?.description || 'Premium subscription',
      subscriptionType: subscriptionType,
      amount: amountPaid,
      discountAmount: discountAmount,
      netAmount: amountPaid - discountAmount,
      currency: 'SAR', // Default currency
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      promoCode: promoCode || null
    };
    
    return NextResponse.json({ paymentIntent }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
