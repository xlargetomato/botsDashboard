import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromToken } from '@/lib/auth';

/**
 * Creates a subscription only after verifying successful payment
 * This is the critical endpoint that replaces the flawed flow of creating subscriptions before payment
 */
export async function POST(request) {
  try {
    // Retrieve user information from token
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // Get request data
    const requestData = await request.json();
    console.log('FULL REQUEST DATA:', JSON.stringify(requestData, null, 2));
    
    // Extract all potential subscription data with proper defaults
    const { 
      transactionId, 
      paymentIntentId, 
      invoiceId, 
      subscriptionType, 
      amount,
      planId: requestPlanId 
    } = requestData;

    console.log('EXTRACTED SUBSCRIPTION TYPE:', subscriptionType);
    console.log('EXTRACTED AMOUNT:', amount);

    // Initialize variables with proper validation
    let planId = null;
    let finalSubscriptionType = subscriptionType || null;
    let finalAmount = amount ? parseFloat(amount) : null;
    let discountAmount = 0;
    let promoCode = null;

    console.log('INITIAL finalSubscriptionType:', finalSubscriptionType);

    // Get a valid plan ID from the database
    try {
      // First try to get the plan ID from the request
      if (requestPlanId) {
        // Verify if the plan ID exists in the database
        const planCheck = await executeQuery(
          `SELECT id, subscription_type, price_monthly, price_yearly FROM subscription_plans WHERE id = ?`,
          [requestPlanId]
        );
        
        if (planCheck && planCheck.length > 0) {
          planId = requestPlanId;
          console.log('FOUND PLAN:', planCheck[0]);
          
          // If subscription type wasn't provided, get it from the plan
          if (!finalSubscriptionType) {
            finalSubscriptionType = planCheck[0].subscription_type;
            console.log('USING PLAN SUBSCRIPTION TYPE:', finalSubscriptionType);
          }
          
          // If amount wasn't provided, get it from the plan based on subscription type
          if (finalAmount === null) {
            if (finalSubscriptionType === 'yearly') {
              finalAmount = parseFloat(planCheck[0].price_yearly) || 0;
              console.log('USING YEARLY PRICE:', finalAmount);
            } else {
              finalAmount = parseFloat(planCheck[0].price_monthly) || 0;
              console.log('USING MONTHLY PRICE:', finalAmount);
            }
          }
        }
      }
      
      // If no valid plan ID yet, get the first available plan
      if (!planId) {
        const plans = await executeQuery(
          `SELECT id, subscription_type, price_monthly, price_yearly FROM subscription_plans WHERE is_active = 1 LIMIT 1`
        );
        
        if (plans && plans.length > 0) {
          planId = plans[0].id;
          console.log('USING DEFAULT PLAN:', plans[0]);
          
          // If subscription type wasn't provided, get it from the plan
          if (!finalSubscriptionType) {
            finalSubscriptionType = plans[0].subscription_type;
            console.log('USING DEFAULT PLAN SUBSCRIPTION TYPE:', finalSubscriptionType);
          }
          
          // If amount wasn't provided, get it from the plan based on subscription type
          if (finalAmount === null) {
            if (finalSubscriptionType === 'yearly') {
              finalAmount = parseFloat(plans[0].price_yearly) || 0;
              console.log('USING DEFAULT YEARLY PRICE:', finalAmount);
            } else {
              finalAmount = parseFloat(plans[0].price_monthly) || 0;
              console.log('USING DEFAULT MONTHLY PRICE:', finalAmount);
            }
          }
        } else {
          return NextResponse.json({ error: 'No subscription plans available' }, { status: 400 });
        }
      }
    } catch (error) {
      console.error('Error getting plan:', error);
      return NextResponse.json({ error: 'Failed to get plan', details: error.message }, { status: 500 });
    }

    // If we still don't have a subscription type, log a warning but don't default
    if (!finalSubscriptionType) {
      console.warn('No subscription type found for subscription');
      // Don't set any default, let it be null so we can detect this case
    }
    
    // If we still don't have an amount, default to 0 but log a warning
    if (finalAmount === null) {
      console.warn('No amount found for subscription, defaulting to 0');
      finalAmount = 0;
    }

    // Force subscription type to yearly if explicitly specified in request
    if (subscriptionType === 'yearly') {
      finalSubscriptionType = 'yearly';
      console.log('USING EXPLICITLY REQUESTED YEARLY SUBSCRIPTION TYPE');
    } else if (subscriptionType === 'monthly') {
      finalSubscriptionType = 'monthly';
      console.log('USING EXPLICITLY REQUESTED MONTHLY SUBSCRIPTION TYPE');
    } else if (subscriptionType === 'weekly') {
      finalSubscriptionType = 'weekly';
      console.log('USING EXPLICITLY REQUESTED WEEKLY SUBSCRIPTION TYPE');
    }

    // If we have a transaction ID, try to get details from payment_transactions
    if (transactionId) {
      try {
        const transactionResults = await executeQuery(
          `SELECT * FROM payment_transactions WHERE transaction_id = ? OR order_number = ?`,
          [transactionId, transactionId]
        );

        if (transactionResults && transactionResults.length > 0) {
          const transaction = transactionResults[0];
          console.log('FOUND TRANSACTION:', transaction);
          
          // Extract subscription type from payment_gateway_response if available
          if (transaction.payment_gateway_response) {
            try {
              const responseData = JSON.parse(transaction.payment_gateway_response);
              console.log('PAYMENT GATEWAY RESPONSE:', responseData);
              
              // Check for subscription type in various places in the response
              if (responseData.metadata && responseData.metadata.subscriptionType) {
                finalSubscriptionType = responseData.metadata.subscriptionType;
                console.log('EXTRACTED SUBSCRIPTION TYPE FROM TRANSACTION METADATA:', finalSubscriptionType);
              } else if (responseData.subscriptionType) {
                finalSubscriptionType = responseData.subscriptionType;
                console.log('EXTRACTED SUBSCRIPTION TYPE FROM TRANSACTION:', finalSubscriptionType);
              } else if (responseData.products && responseData.products[0] && responseData.products[0].description) {
                // Try to extract from product description (e.g., "Plan - yearly billing")
                const description = responseData.products[0].description.toLowerCase();
                if (description.includes('yearly')) {
                  finalSubscriptionType = 'yearly';
                  console.log('EXTRACTED YEARLY SUBSCRIPTION TYPE FROM PRODUCT DESCRIPTION');
                }
              }
            } catch (parseError) {
              console.error('Error parsing payment_gateway_response:', parseError);
            }
          }
          
          // Only use transaction amount if we don't already have one
          if (finalAmount === 0 || finalAmount === null) {
            finalAmount = parseFloat(transaction.amount) || 0;
            console.log('USING TRANSACTION AMOUNT:', finalAmount);
          }
        }
      } catch (error) {
        console.error('Error fetching transaction:', error);
      }
    }

    // Proceed with subscription creation
    const subscriptionId = uuidv4(); // Generate a unique ID

    // Calculate subscription dates based on subscription type
    const now = new Date();
    const startDate = new Date(now);
    const expireDate = new Date(now);
    
    console.log(`FINAL VALUES - Type: ${finalSubscriptionType}, Amount: ${finalAmount}`);
    
    if (finalSubscriptionType === 'yearly') {
      expireDate.setFullYear(startDate.getFullYear() + 1);
      console.log('SETTING YEARLY EXPIRATION DATE:', expireDate);
    } else if (finalSubscriptionType === 'weekly') {
      expireDate.setDate(startDate.getDate() + 7);
      console.log('SETTING WEEKLY EXPIRATION DATE:', expireDate);
    } else {
      expireDate.setMonth(startDate.getMonth() + 1);
      console.log('SETTING MONTHLY EXPIRATION DATE:', expireDate);
    }

    const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const formattedExpireDate = expireDate.toISOString().slice(0, 19).replace('T', ' ');

    // Insert subscription into the database
    try {
    await executeQuery(
      `INSERT INTO subscriptions (id, user_id, plan_id, subscription_type, amount_paid, payment_method, transaction_id, promo_code, discount_amount, status, started_date, expired_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        subscriptionId,
        userId,
          planId,
          finalSubscriptionType,
          finalAmount,
          'paylink',
          transactionId || null,
          promoCode,
          discountAmount,
        'available',
        formattedStartDate,
        formattedExpireDate
      ]
    );
      
      console.log('SUBSCRIPTION CREATED WITH TYPE:', finalSubscriptionType);

    return NextResponse.json({
        subscription: {
          id: subscriptionId,
          user_id: userId,
          plan_id: planId,
          subscription_type: finalSubscriptionType,
          amount_paid: finalAmount,
          status: 'available',
          started_date: formattedStartDate,
          expired_date: formattedExpireDate
        },
        message: 'Subscription created successfully'
    }, { status: 201 });
    } catch (error) {
      console.error('Error creating subscription:', error);
      return NextResponse.json({ error: 'Failed to create subscription', details: error.message }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in create-from-payment endpoint:', error);
    return NextResponse.json({ error: 'Failed to create subscription', details: error.message }, { status: 500 });
  }
}
