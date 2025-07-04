import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';
import { createInvoice, generateReferenceNumber, formatAmount } from '@/lib/paylink/api';
import PAYLINK_CONFIG from '@/lib/paylink/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST handler to create a new invoice in Paylink.sa
 * It uses real subscription data from the user's selected plan
 */
export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    
    // Get request data - containing subscriptionId and any custom items
    const requestData = await request.json();
    const { subscriptionId, callbackUrl } = requestData;
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required subscription ID' },
        { status: 400 }
      );
    }
    
    // Validate the subscription ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subscriptionId)) {
      console.error(`Invalid subscription ID format: ${subscriptionId}`);
      return NextResponse.json(
        { error: 'Invalid subscription ID format' },
        { status: 400 }
      );
    }
    
    // Log the request for debugging
    console.log('Processing Paylink invoice request:', { subscriptionId, userId });
    
    // Get subscription details from database
    let subscriptionResults;
    try {
      subscriptionResults = await executeQuery(`
        SELECT s.*, p.name as plan_name, p.description as plan_description
        FROM subscriptions s
        LEFT JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.id = ?
      `, [subscriptionId]);
      
      console.log('Subscription query results:', subscriptionResults);
      
      if (!subscriptionResults.length) {
        // Try again with just the ID to check if subscription exists at all
        const checkSubscription = await executeQuery('SELECT id, user_id FROM subscriptions WHERE id = ?', [subscriptionId]);
        console.log('Subscription existence check:', checkSubscription);
        
        if (checkSubscription.length) {
          console.log('Subscription exists but belongs to different user:', { 
            foundUserId: checkSubscription[0].user_id,
            requestUserId: userId 
          });
          return NextResponse.json(
            { error: 'Subscription belongs to a different user' },
            { status: 403 }
          );
        } else {
          console.log('Subscription not found with ID:', subscriptionId);
          return NextResponse.json(
            { error: 'Subscription not found with the provided ID' },
            { status: 404 }
          );
        }
      }
      
      // Since we found the subscription, let's check if it belongs to the user
      if (subscriptionResults[0].user_id !== userId) {
        console.log('User ID mismatch:', { 
          subscriptionUserId: subscriptionResults[0].user_id, 
          requestUserId: userId 
        });
        return NextResponse.json(
          { error: 'Subscription does not belong to authenticated user' },
          { status: 403 }
        );
      }
    } catch (dbError) {
      console.error('Database error when fetching subscription:', dbError);
      return NextResponse.json(
        { error: 'Database error when fetching subscription', details: dbError.message },
        { status: 500 }
      );
    }
    
    const subscription = subscriptionResults[0];
    
    // Get user details from database
    const userResults = await executeQuery(`
      SELECT * FROM users WHERE id = ?
    `, [userId]);
    
    if (!userResults.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const user = userResults[0];
    
    // Generate a unique reference number for the invoice
    const referenceNumber = generateReferenceNumber();
    
    // Calculate amount based on subscription details
    // Ensure amount_paid is a valid number before formatting
    if (subscription.amount_paid === undefined || subscription.amount_paid === null) {
      console.error('Missing amount_paid in subscription:', subscription);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid subscription amount',
          message: 'Subscription amount is missing or invalid' 
        },
        { status: 400 }
      );
    }
    
    // Log the amount for debugging
    console.log('Processing amount:', subscription.amount_paid, typeof subscription.amount_paid);
    
    const amount = formatAmount(subscription.amount_paid);
    
    // Prepare the invoice data according to the EXACT format from Paylink documentation
    // https://developer.paylink.sa/docs/add-invoice
    const invoiceData = {
      // Required fields exactly as in the documentation
      orderNumber: referenceNumber,
      amount: amount, // Using numeric value as shown in the documentation
      callBackUrl: callbackUrl || PAYLINK_CONFIG.DEFAULT_CALLBACK_URL, // Note: capital 'B' in callBackUrl
      clientName: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Client',
      clientEmail: user.email,
      clientMobile: user.phone || '',
      currency: PAYLINK_CONFIG.CURRENCY,
      // Products array with exact field names from documentation
      products: [
        {
          title: subscription.plan_name || 'Subscription', // Use title not name
          price: amount, // Using numeric value
          qty: 1, // Use qty not quantity
          description: subscription.plan_description || `${subscription.plan_name} - ${subscription.subscription_type} subscription`
        }
      ],
      // Optional fields that might help
      note: `Subscription ${subscription.subscription_type} plan`,
      displayPending: true
    };
    
    // Log the full request being sent for debugging
    console.log('Sending Paylink invoice request with data:', JSON.stringify(invoiceData, null, 2));
    
    // Add extensive logging before calling Paylink
    console.log('==================== PAYLINK DEBUG ====================');
    console.log('About to call Paylink createInvoice function');
    console.log('Using credentials:', {
      idToken: PAYLINK_CONFIG.ID_TOKEN ? `${PAYLINK_CONFIG.ID_TOKEN.substring(0, 10)}...` : 'MISSING',
      secretKey: PAYLINK_CONFIG.SECRET_KEY ? 'PRESENT' : 'MISSING',
      baseUrl: PAYLINK_CONFIG.BASE_URL
    });
    
    // Create the invoice in Paylink.sa
    let invoiceResponse;
    try {
      // Call with try/catch to get detailed error
      console.log('Calling createInvoice now...');
      invoiceResponse = await createInvoice(invoiceData);
      console.log('Paylink createInvoice succeeded with response:', JSON.stringify(invoiceResponse, null, 2));
    } catch (paylinkError) {
      // Log detailed error info
      console.error('Paylink createInvoice failed with error:', {
        name: paylinkError.name,
        message: paylinkError.message,
        stack: paylinkError.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      // Throw a more informative error
      throw new Error(`Paylink invoice creation failed: ${paylinkError.message}`);
    }
    
    // Store the Paylink invoice details in the database with a transaction ID that we'll track
    const paymentTransactionId = uuidv4();
    console.log(`Creating payment transaction with ID: ${paymentTransactionId} for subscription: ${subscriptionId}`);
    
    await executeQuery(`
      INSERT INTO payment_transactions 
      (id, user_id, subscription_id, amount, payment_method, transaction_id, status, paylink_invoice_id, paylink_reference)
      VALUES (?, ?, ?, ?, 'paylink', ?, 'pending', ?, ?)
    `, [
      paymentTransactionId,
      userId,
      subscriptionId,
      amount,
      referenceNumber,
      invoiceResponse.id,
      referenceNumber
    ]);
    
    // Store relationship between transaction ID and subscription ID for better tracking
    try {
      // Create tracking table if it doesn't exist
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS subscription_payment_mappings (
          id VARCHAR(36) PRIMARY KEY,
          subscription_id VARCHAR(36) NOT NULL,
          transaction_id VARCHAR(255) NOT NULL,
          paylink_invoice_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (transaction_id),
          INDEX (paylink_invoice_id),
          INDEX (subscription_id)
        )
      `);
      
      // Insert tracking record
      await executeQuery(`
        INSERT INTO subscription_payment_mappings 
        (id, subscription_id, transaction_id, paylink_invoice_id)
        VALUES (UUID(), ?, ?, ?)
      `, [subscriptionId, referenceNumber, invoiceResponse.id]);
    } catch (trackingError) {
      console.error('Failed to create subscription payment mapping:', trackingError);
      // Non-fatal error, continue with the process
    }
    
    // Update the subscription with the Paylink reference
    await executeQuery(`
      UPDATE subscriptions 
      SET transaction_id = ?, status = 'pending', updated_at = NOW()
      WHERE id = ?
    `, [referenceNumber, subscriptionId]);
    
    // Extract the payment URL correctly from the response
    // The test script shows the checkUrl property is available in the response
    const paymentUrl = invoiceResponse.checkUrl || invoiceResponse.url || null;
    
    console.log('Extracted payment URL:', paymentUrl);
    console.log('Full Paylink response:', JSON.stringify(invoiceResponse, null, 2));
    
    return NextResponse.json({
      success: true,
      invoiceId: invoiceResponse.id || invoiceResponse.transactionNo,
      transactionId: referenceNumber,
      paymentUrl: paymentUrl,
      invoiceDetails: invoiceResponse
    });
  } catch (error) {
    console.error('Error creating Paylink invoice:', error);
    
    // Log detailed diagnostic information
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // Create a more informative error response
    const errorDetails = {
      success: false,
      error: 'Failed to create invoice',
      message: error.message || 'Unknown error occurred',
      errorType: error.name || 'Error',
      timestamp: new Date().toISOString(),
      // Include additional troubleshooting info
      debug: {
        paylinkConfig: {
          baseUrl: PAYLINK_CONFIG.BASE_URL,
          hasIdToken: !!PAYLINK_CONFIG.ID_TOKEN,
          hasSecretKey: !!PAYLINK_CONFIG.SECRET_KEY,
          defaultCallbackUrl: PAYLINK_CONFIG.DEFAULT_CALLBACK_URL
        }
      }
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}
