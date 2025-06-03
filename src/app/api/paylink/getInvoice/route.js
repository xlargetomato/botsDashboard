import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeQuery } from '@/lib/db/config';
import { getInvoice } from '@/lib/paylink/api';

/**
 * GET handler to verify payment status of an invoice
 * This endpoint allows checking the current status of a payment
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the invoice ID from query parameters
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('invoiceId');
    const transactionId = url.searchParams.get('transactionId');
    
    if (!invoiceId && !transactionId) {
      return NextResponse.json(
        { error: 'Missing invoice ID or transaction ID' },
        { status: 400 }
      );
    }
    
    // Query based on invoice ID or transaction ID
    let transactionResults;
    if (invoiceId) {
      // In our database schema, we only have transaction_id column
      // The invoiceId from Paylink might be stored there
      transactionResults = await executeQuery(`
        SELECT * FROM payment_transactions 
        WHERE transaction_id = ?
      `, [invoiceId]);
    } else if (transactionId) {
      transactionResults = await executeQuery(`
        SELECT * FROM payment_transactions 
        WHERE transaction_id = ?
      `, [transactionId]);
    }
    
    if (!transactionResults.length) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    const transaction = transactionResults[0];
    
    // Get current user ID
    const userId = authResult.userId;
    
    // Verify that the transaction belongs to the authenticated user
    if (transaction.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this transaction' },
        { status: 403 }
      );
    }
    
    // Get subscription details
    const subscriptionResults = await executeQuery(`
      SELECT s.*, p.name as plan_name, p.description as plan_description
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `, [transaction.subscription_id]);
    
    // Check invoice status directly from Paylink.sa
    let invoiceDetails = null;
    let paylinkError = null;
    let paylinkStatusCode = null;
    
    try {
      // Use the transaction_id as invoice ID (the only field available in our schema)
      const invoiceIdToCheck = transaction.transaction_id;
      invoiceDetails = await getInvoice(invoiceIdToCheck);
      
      // Check for error information in the Paylink response
      if (invoiceDetails) {
        // Extract any status code
        if (invoiceDetails.statusCode) {
          paylinkStatusCode = invoiceDetails.statusCode.toString();
          console.log(`Paylink returned status code: ${paylinkStatusCode}`);
        }
        
        // Extract error message if present
        if (invoiceDetails.message && (
          invoiceDetails.message.toLowerCase().includes('error') ||
          invoiceDetails.message.toLowerCase().includes('fail') ||
          invoiceDetails.message.toLowerCase().includes('reject')
        )) {
          paylinkError = invoiceDetails.message;
          console.log(`Paylink returned error message: ${paylinkError}`);
        }
        
        // Update transaction status based on Paylink response
        if (invoiceDetails.status) {
          transaction.paylinkStatus = invoiceDetails.status;
          
          if (invoiceDetails.status.toLowerCase() === 'paid') {
            transaction.status = 'completed';
          } else if (
            invoiceDetails.status.toLowerCase() === 'failed' || 
            invoiceDetails.status.toLowerCase() === 'cancelled' ||
            invoiceDetails.status.toLowerCase() === 'rejected'
          ) {
            transaction.status = 'failed';
            // Set error message if not already set
            paylinkError = paylinkError || 'Payment was rejected or cancelled';
          }
        }
        
        // Handle specific error codes even if status doesn't indicate failure
        if (paylinkStatusCode) {
          if (paylinkStatusCode === '451') {
            transaction.status = 'failed';
            paylinkError = paylinkError || 'Payment unavailable due to legal restrictions (451)';
          } else if (paylinkStatusCode === '412') {
            transaction.status = 'failed';
            paylinkError = paylinkError || 'Payment processor rejected the transaction (412)';
          } else if (['400', '401', '403', '404', '422', '500'].includes(paylinkStatusCode)) {
            transaction.status = 'failed';
            paylinkError = paylinkError || `Payment failed with code ${paylinkStatusCode}`;
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching invoice details from Paylink: ${error.message}`);
      // Store the error information
      paylinkError = error.message;
      
      // Check for specific API failure error codes in the message
      if (error.message.includes('451')) {
        paylinkStatusCode = '451';
      } else if (error.message.includes('412')) {
        paylinkStatusCode = '412';
      } else if (error.message.includes('status code')) {
        // Try to extract any status code from the error message
        const statusMatch = error.message.match(/status code (?:is )?([0-9]{3})/i);
        if (statusMatch && statusMatch[1]) {
          paylinkStatusCode = statusMatch[1];
        }
      }
    }
    
    // Extract plan information from Paylink details if available
    let extractedPlanId = null;
    let extractedPlanName = null;
    
    if (invoiceDetails && 
        invoiceDetails.gatewayOrderRequest && 
        invoiceDetails.gatewayOrderRequest.products && 
        invoiceDetails.gatewayOrderRequest.products.length > 0) {
      
      const product = invoiceDetails.gatewayOrderRequest.products[0];
      console.log('Found product in Paylink response:', product);
      
      // Extract the plan name from the title (which contains "Tier X Subscription...") 
      if (product.title) {
        const titleMatch = product.title.match(/^(Tier \d+|Basic|Pro|Enterprise|Premium|Standard)/i);
        if (titleMatch) {
          extractedPlanName = titleMatch[0];
          console.log('Extracted plan name from product title:', extractedPlanName);
          
          // If we have metadata with subscription_id, try to get the plan ID from the database
          if (invoiceDetails.metadata) {
            try {
              const metadata = JSON.parse(invoiceDetails.metadata);
              if (metadata.subscription_id) {
                // Look up the correct plan for this plan name
                const planLookup = await executeQuery(
                  `SELECT id FROM subscription_plans WHERE name LIKE ?`,
                  [`%${extractedPlanName}%`]
                );
                
                if (planLookup && planLookup.length > 0) {
                  extractedPlanId = planLookup[0].id;
                  console.log('Found matching plan ID:', extractedPlanId);
                }
              }
            } catch (metadataError) {
              console.error('Error parsing metadata:', metadataError);
            }
          }
        }
      }
    }
    
    // Use the subscription from database but enhance it with extracted data if needed
    let subscriptionData = {};
    
    if (subscriptionResults.length > 0) {
      // Start with database values
      subscriptionData = {
        id: subscriptionResults[0].id,
        planId: subscriptionResults[0].plan_id,
        planName: subscriptionResults[0].plan_name || null,
        planDescription: subscriptionResults[0].plan_description || '',
        subscriptionType: subscriptionResults[0].subscription_type || 'monthly',
        startedDate: subscriptionResults[0].started_date,
        expiredDate: subscriptionResults[0].expired_date,
        status: subscriptionResults[0].status
      };
      
      // If database values are missing or invalid, use extracted values
      if ((!subscriptionData.planId || subscriptionData.planId === '00000000-0000-0000-0000-000000000000') && extractedPlanId) {
        subscriptionData.planId = extractedPlanId;
      }
      
      if ((!subscriptionData.planName) && extractedPlanName) {
        subscriptionData.planName = extractedPlanName;
      }
    } else {
      // No subscription in database, use extracted values
      subscriptionData = {
        planId: extractedPlanId || null,
        planName: extractedPlanName || null,
        status: 'pending'
      };
    }
    
    console.log('Final subscription data:', subscriptionData);
    
    // Construct data object with consistent format for the frontend
    const responseData = {
      success: true,
      data: {
        // Set a top-level status that the frontend can easily access
        status: transaction.status === 'completed' ? 'Paid' : 
                transaction.status === 'failed' ? 'Failed' : 'Pending',
        
        // Include error information from Paylink if available
        errorMessage: paylinkError,
        statusCode: paylinkStatusCode,
        
        transaction: {
          id: transaction.id,
          transactionId: transaction.transaction_id,
          invoiceId: transaction.transaction_id, // Using transaction_id as invoiceId for Paylink
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod: transaction.payment_method,
          createdAt: transaction.created_at,
          errorMessage: transaction.error_message || paylinkError // Include any stored error message
        },
        
        // Use the enhanced subscription data
        subscription: subscriptionData,
        
        // Include Paylink details if available
        paylinkDetails: invoiceDetails || null
      }
    };
    
    // If we have error information but transaction is still pending, update it to failed
    if (responseData.data.status === 'Pending' && (paylinkError || paylinkStatusCode)) {
      console.log('Changing status to Failed due to detected Paylink errors');
      responseData.data.status = 'Failed';
      
      // Also update the transaction in the database to avoid stuck transactions
      try {
        await executeQuery(
          `UPDATE payment_transactions SET status = 'failed', error_message = ? WHERE id = ?`,
          [paylinkError || `Payment failed with code ${paylinkStatusCode}`, transaction.id]
        );
        console.log(`Updated transaction ${transaction.id} status to failed due to Paylink errors`);
      } catch (updateError) {
        console.error('Error updating transaction status:', updateError);
        // Non-fatal, continue with response
      }
    }
    
    console.log('Sending payment details response:', responseData);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify payment',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
