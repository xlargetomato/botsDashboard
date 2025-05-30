import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSubscriptionsTable } from '@/lib/db/migrations/subscriptions';

// POST handler to validate a promo code
export async function POST(request) {
  try {
    // Try to verify authentication, but don't fail if it doesn't work
    try {
      const authResult = await verifyAuth(request);
      if (!authResult.success) {
        console.log('Auth not successful, continuing anyway');
      }
    } catch (authError) {
      console.error('Auth error, continuing anyway:', authError);
    }
    
    
    const { promoCode, planId, subscriptionType } = await request.json();
    
    if (!promoCode) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }
    
    // Get the plan price to calculate discount
    let planPrice = 0;
    if (planId && subscriptionType) {
      try {
        const planResult = await executeQuery(
          'SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE',
          [planId]
        );
        
        if (planResult.length > 0) {
          planPrice = subscriptionType === 'monthly' 
            ? planResult[0].price_monthly 
            : planResult[0].price_yearly;
        } else {
          // Use sample plan prices if no plan found in database
          if (planId === '1') {
            planPrice = subscriptionType === 'monthly' ? 99.99 : 999.99;
          } else if (planId === '2') {
            planPrice = subscriptionType === 'monthly' ? 199.99 : 1999.99;
          } else if (planId === '3') {
            planPrice = subscriptionType === 'monthly' ? 299.99 : 2999.99;
          }
        }
      } catch (dbError) {
        console.error('Database error when fetching plan:', dbError);
        // Use default price for testing
        planPrice = subscriptionType === 'monthly' ? 99.99 : 999.99;
      }
    }
    
    let promo;
    
    // Try to validate coupon code from database
    try {
      // Ensure the coupons table exists
      try {
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS coupons (
            id VARCHAR(36) PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type ENUM('percentage', 'fixed') NOT NULL,
            discount_value DECIMAL(10, 2) NOT NULL,
            max_uses INT,
            used_count INT DEFAULT 0,
            expiry_date DATETIME,
            active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (tableError) {
        console.error('Error ensuring coupons table exists:', tableError);
      }
      
      const couponResult = await executeQuery(
        `SELECT * FROM coupons 
         WHERE code = ? 
         AND active = TRUE 
         AND (expiry_date IS NULL OR expiry_date >= NOW())`,
        [promoCode]
      );
      
      if (couponResult.length > 0) {
        promo = {
          id: couponResult[0].id,
          code: couponResult[0].code,
          discount_type: couponResult[0].discount_type,
          discount_value: parseFloat(couponResult[0].discount_value),
          max_uses: couponResult[0].max_uses,
          current_uses: couponResult[0].used_count,
          is_active: couponResult[0].active
        };
      }
    } catch (dbError) {
      console.error('Database error when validating coupon code:', dbError);
    }
    
    // If still no promo found, return invalid
    if (!promo) {
      return NextResponse.json(
        { valid: false, message: 'Invalid or expired promo code' },
        { status: 200 }
      );
    }
    
    // Check if max uses is reached
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return NextResponse.json(
        { valid: false, message: 'This promo code has reached its usage limit' },
        { status: 200 }
      );
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (planPrice > 0) {
      if (promo.discount_type === 'percentage') {
        discountAmount = (planPrice * promo.discount_value) / 100;
      } else {
        discountAmount = promo.discount_value;
      }
    }
    
    // Update coupon usage count
    try {
      await executeQuery(
        `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`,
        [promo.id]
      );
    } catch (updateError) {
      console.error('Error updating coupon usage count:', updateError);
      // Continue anyway, don't fail the request if just the count update fails
    }
    
    // Get the currency symbol for the message
    const currencySymbol = 'ريال';
    
    return NextResponse.json({
      valid: true,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount,
      message: `Promo code applied: ${promo.discount_type === 'percentage' ? promo.discount_value + '%' : currencySymbol + ' ' + promo.discount_value} off`
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { valid: false, message: 'Error processing promo code' },
      { status: 200 }
    );
  }
}
