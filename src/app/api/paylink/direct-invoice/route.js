import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';
import { v4 as uuidv4 } from 'uuid';

// Import Paylink service functions
import { createDirectCheckout, validateConfig } from '@/lib/paylink/service';
import PAYLINK_CONFIG from '@/lib/paylink/config';

/**
 * Direct implementation of Paylink invoice creation
 * POST /api/paylink/direct-invoice
 */
export async function POST(request) {
  try {
    // Verify the Paylink configuration
    const configStatus = validateConfig();
    
    if (!configStatus.isValid) {
      console.error('Invalid Paylink configuration:', configStatus.missingVars);
      return NextResponse.json(
        {
          success: false,
          error: 'Paylink configuration error',
          message: `Missing required Paylink configuration: ${configStatus.missingVars.join(', ')}`,
          environment: configStatus.environment
        },
        { status: 500 }
      );
    }
    
    // Verify authentication
    let userId;
    try {
      const authResult = await verifyAuth(request);
      if (!authResult.success) {
        // For development only: allow unauthenticated requests with explicit user_id
        if (process.env.NODE_ENV !== 'production') {
          const requestData = await request.clone().json();
          if (requestData.user_id) {
            console.log(`⚠️ Using user_id from request body for development: ${requestData.user_id}`);
            userId = requestData.user_id;
          } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
        } else {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } else {
        userId = authResult.userId;
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }
    
    // Get request data
    const requestData = await request.json();
    const { subscriptionId, callbackUrl, amount, customerInfo, products, discountAmount, orderNumber } = requestData;
    
    // Check if we have enough data to proceed
    if (!amount && !subscriptionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required data',
          message: 'Either subscription ID or payment amount is required' 
        },
        { status: 400 }
      );
    }
    
    // Get origin from request headers for callback URLs
    const origin = requestData.origin || 
                request.headers.get('origin') || 
                request.headers.get('referer') || 
                (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000');
    
    console.log('DEBUG: Resolved origin for callback URLs:', origin);
    
    // Get subscription details if we have a subscription ID
    let subscription = null;
    let planId = ''; // Added planId variable
    let planName = '';
    let planDescription = '';
    let paymentAmount = amount;
    
    if (subscriptionId) {
      try {
        // Fetch subscription details
        const subscriptionResults = await executeQuery(
          `SELECT * FROM subscriptions WHERE id = ?`,
          [subscriptionId]
        );
        
        if (subscriptionResults && subscriptionResults.length > 0) {
          subscription = subscriptionResults[0];
          
          // Use subscription amount if not provided in request
          if (!paymentAmount && subscription.amount_paid) {
            paymentAmount = subscription.amount_paid;
          }
          
          // Fetch plan details if available
          if (subscription.plan_id) {
            console.log('Looking up plan details for ID:', subscription.plan_id);
            try {
              // Get ALL plans first to debug
              const allPlansResults = await executeQuery(`SELECT id, name, description FROM subscription_plans`);
              console.log('All available plans in database:', allPlansResults);
              
              // Now get the specific plan
              const planResults = await executeQuery(
                `SELECT id, name, description FROM subscription_plans WHERE id = ?`,
                [subscription.plan_id]
              );
              
              console.log('Plan lookup results:', planResults);
              
              if (planResults && planResults.length > 0) {
                const plan = planResults[0];
                planId = plan.id; // Store the actual planId from database
                
                // Check if name exists and is not null
                if (plan.name) {
                  planName = plan.name;
                  console.log('Found valid plan name:', planName);
                } else {
                  // If name is null/undefined/empty, try to map from the ID
                  if (planId === '40f38abf-47ff-4990-97f4-73a1198ac1c8') {
                    planName = 'Tier 3';
                    console.log('Using hardcoded plan name Tier 3 for this ID');
                  } else if (planId === 'afa3745-399e-47d5-87ac-6eb2ee933335') {
                    planName = 'Tier 2';
                    console.log('Using hardcoded plan name Tier 2 for this ID');
                  } else if (planId === 'f6a9bc5c-4ec4-44ea-9f3d-50513b5f414d') {
                    planName = 'Tier 1';
                    console.log('Using hardcoded plan name Tier 1 for this ID');
                  } else {
                    planName = '';
                    console.log('Could not determine plan name from ID, using empty string');
                  }
                }
                
                planDescription = plan.description || '';
                console.log('Final plan details:', { planId, planName, planDescription });
              }
            } catch (planError) {
              console.warn('Error fetching plan details (non-fatal):', planError.message);
              // Continue with default values
            }
          }
        } else {
          console.warn(`Subscription not found with ID: ${subscriptionId}`);
        }
      } catch (dbError) {
        console.error('Database error fetching subscription:', dbError.message);
        // Continue without subscription data
      }
    }
    
    // Validate payment amount
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payment amount',
          message: 'A valid payment amount greater than zero is required' 
        },
        { status: 400 }
      );
    }
    
    // Prepare customer information from various sources
    const customer = {
      // Use customer info from request first
      name: customerInfo?.clientName || customerInfo?.name || '',
      email: customerInfo?.clientEmail || customerInfo?.email || '',
      phone: customerInfo?.clientMobile || customerInfo?.phone || ''
    };
    
    // If customer info is incomplete and we have subscription, use that
    if (subscription && (!customer.name || !customer.email)) {
      customer.name = customer.name || subscription.customer_name || '';
      customer.email = customer.email || subscription.customer_email || '';
      customer.phone = customer.phone || subscription.customer_phone || '';
    }
    
    // If still incomplete, try to get user info from the database
    if (!customer.name || !customer.email) {
      try {
        const userResults = await executeQuery(
          `SELECT name, email, phone FROM users WHERE id = ?`,
          [userId]
        );
        
        if (userResults && userResults.length > 0) {
          const userRecord = userResults[0];
          customer.name = customer.name || userRecord.name || '';
          customer.email = customer.email || userRecord.email || '';
          customer.phone = customer.phone || userRecord.phone || '';
        }
      } catch (userError) {
        console.warn('Error fetching user details (non-fatal):', userError.message);
      }
    }
    
    // Generate a payment transaction ID for our records
    const paymentTransactionId = uuidv4();
    
    // Prepare data for Paylink direct checkout
    const checkoutData = {
      subscriptionId: subscriptionId,
      transactionId: orderNumber || `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      amount: parseFloat(paymentAmount),
      // Always include currency (SAR is required for Saudi payments)
      currency: PAYLINK_CONFIG.CURRENCY || 'SAR',
      // Ensure callback URLs are properly set and accessible
      callbackUrl: callbackUrl || `${origin}/api/paylink/callback`,
      // Explicitly set 3DS callback URL for handling 3D Secure authentication
      // This MUST point to the correct endpoint that handles Paylink's server-side callback
      threeDSCallBackUrl: `${origin}/api/paylink/callback`,
      // Set return URL to match callback URL
      returnUrl: callbackUrl || `${origin}/api/paylink/callback`,
      planName: planName,
      planDescription: planDescription,
      customerInfo: {
        clientName: customer.name,
        clientEmail: customer.email,
        clientMobile: customer.phone
      },
      products: products || [{
        title: planName,
        price: parseFloat(paymentAmount),
        qty: 1,
        description: planDescription
      }],
      metadata: {
        subscription_id: subscriptionId,
        user_id: userId,
        payment_transaction_id: paymentTransactionId,
        environment: PAYLINK_CONFIG.IS_PRODUCTION ? 'production' : 'sandbox'
      }
    };
    
    // Create the invoice using the Paylink service
    try {
      // Don't try to create the table - use the existing schema
      // First get the actual column names from the payment_transactions table
      try {
        const tableInfo = await executeQuery(`DESCRIBE payments`);
        console.log('Payments table structure:', tableInfo.map(column => column.Field));
      } catch (describeError) {
        console.error('Error examining table structure:', describeError);
        // Non-fatal error, continue with basic columns
      }
      
      // Create the invoice using the Paylink service
      const invoiceResult = await createDirectCheckout(checkoutData);
      // Create a new payment transaction record
      let subscriptionExists = false;
      
      // Generate a guaranteed valid subscription ID
      const effectiveSubscriptionId = subscriptionId || uuidv4();
      
      // Check if the subscription exists before trying to use it
      try {
        const subscriptionCheck = await executeQuery(`
          SELECT id FROM subscriptions WHERE id = ?
        `, [effectiveSubscriptionId]);
        subscriptionExists = subscriptionCheck && subscriptionCheck.length > 0;
        console.log('Subscription check result:', subscriptionExists ? 'Subscription exists' : 'Subscription does not exist');
        
        // Log available subscription columns for debugging
        const subscriptionColumns = await executeQuery('DESCRIBE subscriptions');
        console.log('Available subscription columns:', subscriptionColumns.map(col => col.Field));
      } catch (checkError) {
        console.error('Error checking subscription:', checkError);
        subscriptionExists = false;
      }
      
      // Use a minimal set of core fields that are most likely to exist in any schema
      // Only use the basic fields that are almost certainly in the table
      try {
        // We already created effectiveSubscriptionId above
        
        // CRITICAL FIX: Do NOT create a subscription at this point - only create a payment intent
        // Subscriptions should ONLY be created AFTER payment is confirmed in the create-from-payment endpoint
        console.log('Creating a payment intent record only - no subscription created yet');
        
        // Store the plan details and subscription type in payment_intent for later use
        let planIdToUse = null;
        
        // First try to get plan ID from request data
        if (requestData.planId && requestData.planId !== '00000000-0000-0000-0000-000000000000') {
          planIdToUse = requestData.planId;
          console.log('Using plan ID from request data:', planIdToUse);
        } 
        // If not available, try to get it from metadata
        else if (requestData.metadata?.exactPlanId && requestData.metadata.exactPlanId !== '00000000-0000-0000-0000-000000000000') {
          planIdToUse = requestData.metadata.exactPlanId;
          console.log('Using plan ID from metadata:', planIdToUse);
        }
        // Finally, try to look up by plan name
        else if (requestData.metadata?.exactPlanName || planName) {
          const nameToLookup = requestData.metadata?.exactPlanName || planName;
          console.log('Looking up plan ID by name:', nameToLookup);
          
          try {
            // Look up by plan name
            const planResults = await executeQuery(
              `SELECT id FROM subscription_plans WHERE name = ? LIMIT 1`,
              [nameToLookup]
            );
            
            if (planResults && planResults.length > 0) {
              planIdToUse = planResults[0].id;
              console.log('Found plan ID from database by name:', planIdToUse);
            }
          } catch (planLookupError) {
            console.error('Error looking up plan by name:', planLookupError);
          }
        }
        
        // If we still don't have a valid plan ID, get the first active plan as fallback
        if (!planIdToUse) {
          try {
            console.log('No valid plan ID found, using first active plan as fallback');
            const fallbackPlanResults = await executeQuery(
              `SELECT id FROM subscription_plans WHERE is_active = 1 LIMIT 1`
            );
            
            if (fallbackPlanResults && fallbackPlanResults.length > 0) {
              planIdToUse = fallbackPlanResults[0].id;
              console.log('Using fallback active plan ID:', planIdToUse);
            }
          } catch (fallbackError) {
            console.error('Error getting fallback plan:', fallbackError);
          }
        }
        
        // If we STILL don't have a valid plan ID, this is a serious error
        if (!planIdToUse) {
          console.error('CRITICAL ERROR: Could not determine a valid plan ID for payment intent');
          throw new Error('Unable to create payment intent: no valid plan found');
        }
        
        // Determine the correct subscription type
        const subscriptionType = requestData.metadata?.subscriptionType || 'monthly';
        
        // Store subscription details in the payment_intent table for later use
        // No subscription record is created yet
        try {
          await executeQuery(`
            INSERT INTO payment_intent 
            (id, user_id, plan_id, subscription_type, amount, discount_amount, promo_code, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
          `, [
            effectiveSubscriptionId, // Use this as the payment intent ID
            userId,
            planIdToUse,
            subscriptionType,
            parseFloat(paymentAmount),
            requestData.discountAmount || 0,
            requestData.promoCode || null
          ]);
          
          console.log('Created payment intent with plan ID:', planIdToUse);
        } catch (paymentIntentError) {
          console.error('Error creating payment intent:', paymentIntentError);
          throw new Error('Failed to create payment intent record');
        }  
        
        // Get the actual transaction ID from Paylink response (this is what we need to use for lookups)
        // Paylink returns transactionNo which is different from our orderNumber
        const paylinkTransactionNo = invoiceResult.paylinkTransactionNo || invoiceResult.transactionNo;
        
        console.log('DEBUG: Paylink transaction details:', { 
          orderNumber,
          transactionId: invoiceResult.transactionId, // Our internal SUB-xxx ID
          paylinkTransactionNo: paylinkTransactionNo, // Paylink's short numeric ID
          invoiceId: invoiceResult.invoiceId // Paylink's long invoice ID
        });
        
        // Important: Insert the payment transaction with all possible identifiers
        try {
          const effectiveOrderNumber = orderNumber || `SUB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          
          // Get all possible transaction identifiers from Paylink response
          const paylinkInvoiceId = invoiceResult.invoiceId;
          const paylinkReference = invoiceResult.reference || paylinkTransactionNo;
          
          console.log('DEBUG: All transaction identifiers:', {
            orderNumber: effectiveOrderNumber,
            paylinkTransactionNo,
            paylinkInvoiceId,
            paylinkReference
          });
          
          await executeQuery(`
            INSERT INTO payment_transactions 
            (id, user_id, subscription_id, amount, currency, status, payment_method, 
             transaction_id, order_number, paylink_invoice_id, paylink_reference,
             payment_gateway_response, created_at, updated_at) 
            VALUES (UUID(), ?, ?, ?, ?, 'pending', 'paylink', ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            userId,
            subscriptionId,
            parseFloat(paymentAmount),
            PAYLINK_CONFIG.CURRENCY || 'SAR',
            paylinkTransactionNo,
            effectiveOrderNumber,
            paylinkInvoiceId,
            paylinkReference,
            JSON.stringify(invoiceResult)
          ]);
          
          console.log('DEBUG: Successfully inserted transaction into payment_transactions table with:', {
            transaction_id: paylinkTransactionNo,
            order_number: effectiveOrderNumber,
            paylink_invoice_id: paylinkInvoiceId,
            paylink_reference: paylinkReference
          });
        } catch (insertError) {
          console.error('CRITICAL_ERROR: Failed to insert transaction into payment_transactions table:', insertError);
          throw new Error('Database error saving payment transaction: ' + insertError.message);
        }
        
        console.log('DEBUG: Stored transaction details, mapping our orderNumber to Paylink transactionNo:', {
          orderNumber: orderNumber, // Our internal SUB-xxx ID
          paylinkTransactionNoUsedForDB: paylinkTransactionNo, // The ID stored in payments.transaction_id
          userId,
          paymentAmount
        });
        
        console.log('Successfully inserted payment transaction with transaction_id:', paylinkTransactionNo);
      } catch (insertError) {
        console.error('Error inserting payment transaction:', insertError);
        // Continue despite error - the payment may still be processed
      }
      
      // Update the subscription record directly - use only the fields we're confident exist
      if (subscriptionId) {
        try {
          // First get the actual column names from the subscriptions table
          const subscriptionColumns = [];
          try {
            const tableInfo = await executeQuery(`DESCRIBE subscriptions`);
            tableInfo.forEach(column => subscriptionColumns.push(column.Field));
            console.log('Available subscription columns:', subscriptionColumns);
          } catch (describeError) {
            console.warn('Error getting subscription table structure:', describeError.message);
          }
          
          // Build a dynamic query based on available columns
          let updateFields = [];
          let updateValues = [];
          
          // Only add fields that we know exist in the table
          if (subscriptionColumns.includes('transaction_id')) {
            updateFields.push('transaction_id = ?');
            updateValues.push(invoiceResult.transactionId);
          }
          
          if (subscriptionColumns.includes('status')) {
            updateFields.push('status = ?');
            updateValues.push('pending');
          }
          
          if (subscriptionColumns.includes('updated_at')) {
            updateFields.push('updated_at = NOW()');
          }
          
          // Add the subscription ID at the end
          updateValues.push(subscriptionId);
          
          // Only proceed if we have fields to update
          if (updateFields.length > 0) {
            const updateQuery = `
              UPDATE subscriptions 
              SET ${updateFields.join(', ')}
              WHERE id = ?
            `;
            
            await executeQuery(updateQuery, updateValues);
            console.log('Successfully updated subscription with transaction ID');
          }
        } catch (updateError) {
          console.warn('Error updating subscription (non-fatal):', updateError.message);
          // Non-fatal error, continue
        }
        
        // Update the subscription status to pending
        try {
          await executeQuery(`
            UPDATE subscriptions 
            SET transaction_id = ?, status = 'pending', updated_at = NOW()
            WHERE id = ?
          `, [invoiceResult.transactionId, subscriptionId]);
        } catch (updateError) {
          console.warn('Error updating subscription status (non-fatal):', updateError.message);
          // Non-fatal error, continue
        }
      }
      
      // Add comprehensive debugging to trace the response structure
      console.log('DEBUG: Response from Paylink createDirectCheckout:', invoiceResult);
      
      // Always use database values to ensure no hardcoded plan names
      // Directly query the plan again to ensure we have the correct data
      let planNameToUse = '';
      const planIdToUse = planId || subscriptionId || '';
      
      // If we have a planId, try one more direct query to get the plan name
      if (planIdToUse) {
        try {
          console.log('Making one final direct plan lookup for ID:', planIdToUse);
          
          // Direct database query for the plan name - most reliable method
          const finalPlanQuery = await executeQuery(
            `SELECT name FROM subscription_plans WHERE id = ? LIMIT 1`,
            [planIdToUse]
          );
          
          // Check if we got a result and extract the name
          if (finalPlanQuery && finalPlanQuery.length > 0 && finalPlanQuery[0].name) {
            planNameToUse = finalPlanQuery[0].name;
            console.log('Final lookup successful - using plan name:', planNameToUse);
          } else {
            // Only use the existing planName if the direct query fails
            planNameToUse = planName || '';
            console.log('Final lookup returned no results - falling back to:', planNameToUse || '(empty)');
          }
        } catch (finalLookupError) {
          console.error('Error in final plan lookup:', finalLookupError);
          // Use the existing planName as fallback
          planNameToUse = planName || '';
        }
      } else {
        // No plan ID available
        console.log('No plan ID available for final lookup, using empty plan name');
      }
      
      console.log('Final plan details for URL:', { planIdToUse, planNameToUse });
      
      // Add plan details to the payment URL if they don't already exist
      let enhancedPaymentUrl = invoiceResult.paymentUrl;
      if (enhancedPaymentUrl) {
        // Start with base parameters
        const hasQueryParams = enhancedPaymentUrl.includes('?');
        const separator = hasQueryParams ? '&' : '?';
        let additionalParams = '';
        
        // Add planName if not already in URL
        if (!enhancedPaymentUrl.includes('planName=')) {
          additionalParams += `${additionalParams ? '&' : ''}planName=${encodeURIComponent(planNameToUse)}`;
        }
        
        // Add planId if not already in URL
        if (!enhancedPaymentUrl.includes('planId=') && planIdToUse) {
          additionalParams += `${additionalParams ? '&' : ''}planId=${encodeURIComponent(planIdToUse)}`;
        }
        
        // Apply parameters to URL if we have any
        if (additionalParams) {
          enhancedPaymentUrl = `${enhancedPaymentUrl}${separator}${additionalParams}`;
        }
      }
      
      console.log('Enhanced payment URL with planName:', enhancedPaymentUrl);
      
      // Return success response with payment URL (matched to what EnhancedCheckoutForm expects)
      return NextResponse.json({
        success: true,
        invoiceId: invoiceResult.invoiceId,
        transactionId: invoiceResult.transactionId,
        paymentUrl: enhancedPaymentUrl, // Enhanced URL with planName
        planName: planNameToUse, // Include planName in the response
        amount: parseFloat(paymentAmount),
        currency: invoiceResult.currency || PAYLINK_CONFIG.CURRENCY,
        environment: configStatus.environment
      });
    } catch (invoiceError) {
      console.error('Error creating Paylink invoice:', invoiceError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create payment invoice',
          message: invoiceError.message
        },
        { status: 500 }
      );
    }
    
    try {
      // Try to extract the origin from the referer or headers
      if (requestUrl) {
        const urlObj = new URL(requestUrl);
        appOrigin = `${urlObj.protocol}//${urlObj.host}`;
      } else {
        // Fallback for when no referer is available
        // Use the origin from the original request data if it was provided
        appOrigin = (requestData && requestData.origin) ? requestData.origin : 'http://localhost:3000';
      }
    } catch (urlError) {
      console.error('Error extracting origin:', urlError);
      // Default fallback
      appOrigin = 'http://localhost:3000';
    }
    
    console.log('Using app origin:', appOrigin);
    
    // Create a payment URL that points to our own payment success page
    // This simulates a successful payment immediately without going through Paylink
    paymentUrl = `${appOrigin}/api/paylink/simulate-payment?` + new URLSearchParams({
      invoice_id: simulatedInvoiceId,
      transaction_id: referenceNumber,
      subscription_id: subscriptionId || '',
      amount: paymentAmount,
      status: 'paid'
    }).toString();
    
    console.log('Created simulated payment URL:', paymentUrl);
    
    // IMPORTANT: Add a timestamp parameter to avoid caching issues
    paymentUrl = `${paymentUrl}${paymentUrl.includes('?') ? '&' : '?'}ts=${Date.now()}`;
    
    console.log('Final payment URL with timestamp:', paymentUrl);
    console.log('Payment process completed successfully');
    
    return NextResponse.json({
      success: true,
      invoiceId: simulatedInvoiceId,
      transactionId: referenceNumber,
      paymentUrl: paymentUrl,
      // Include direct alternative URL formats that might work if the main one fails
      alternativeUrls: {
        direct: `${BASE_URL.replace('/api', '')}/checkout/${simulatedInvoiceId}`,
        paymentPortal: `${BASE_URL.replace('/api', '')}/pay/${simulatedInvoiceId}`
      },
      invoiceDetails: invoiceResult
    });
  } catch (error) {
    console.error('Error in direct Paylink invoice creation:', error);
    
    // Log detailed diagnostic information
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process payment',
        message: error.message,
        errorType: error.name,
        timestamp: new Date().toISOString(),
        debug: {
          paylinkConfig: {
            baseUrl: BASE_URL,
            hasIdToken: !!API_ID,
            hasSecretKey: !!SECRET_KEY,
            defaultCallbackUrl: DEFAULT_CALLBACK_URL
          }
        }
      },
      { status: 500 }
    );
  }
}
