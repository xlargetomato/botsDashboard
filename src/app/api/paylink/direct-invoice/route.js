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
    
    // Get subscription details if we have a subscription ID
    let subscription = null;
    let planName = 'Subscription';
    let planDescription = 'Premium subscription';
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
            try {
              const planResults = await executeQuery(
                `SELECT name, description FROM subscription_plans WHERE id = ?`,
                [subscription.plan_id]
              );
              
              if (planResults && planResults.length > 0) {
                const plan = planResults[0];
                planName = plan.name || 'Subscription';
                planDescription = plan.description || 'Premium subscription';
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
      callbackUrl: callbackUrl || `${origin}/api/paylink/callback`,
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
        payment_transaction_id: paymentTransactionId
      }
    };
    
    // Create the invoice using the Paylink service
    try {
      // Don't try to create the table - use the existing schema
      // First get the actual column names from the payment_transactions table
      try {
        const tableInfo = await executeQuery(`DESCRIBE payment_transactions`);
        console.log('Payment transactions table structure:', tableInfo.map(column => column.Field));
      } catch (describeError) {
        console.error('Error examining table structure:', describeError);
        // Non-fatal error, continue with basic columns
      }
      
      // Create the invoice using the Paylink service
      const invoiceResult = await createDirectCheckout(checkoutData);
      
      // Use a minimal set of core fields that are most likely to exist in any schema
      // Only use the basic fields that are almost certainly in the table
      try {
        await executeQuery(`
          INSERT INTO payment_transactions 
          (id, user_id, subscription_id, amount, transaction_id, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `, [
          paymentTransactionId,
          userId,
          subscriptionId || null,
          parseFloat(paymentAmount),
          invoiceResult.transactionId || orderNumber
        ]);
        
        console.log('Successfully inserted payment transaction with minimal fields');
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
      
      // Return success response with payment URL
      return NextResponse.json({
        success: true,
        invoiceId: invoiceResult.invoiceId,
        transactionId: invoiceResult.transactionId,
        paymentUrl: invoiceResult.paymentUrl,
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
