import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { getInvoice, getTransactionByNumber } from '@/lib/paylink/api';
import { validateConfig } from '@/lib/paylink/service';

// Helper function to safely execute database queries with error handling
async function safeQuery(queryFn) {
  try {
    return await queryFn();
  } catch (error) {
    console.error('Database query error:', error.message);
    return null;
  }
}

// Helper function to safely update transaction status
async function updateTransactionStatus(transactionId, status, responseData) {
  try {
    await executeQuery(`
      UPDATE payment_transactions 
      SET status = ?, 
          payment_gateway_response = ?,
          updated_at = NOW() 
      WHERE id = ?
    `, [status, JSON.stringify(responseData || {}), transactionId]);
    return true;
  } catch (error) {
    console.error('Error updating transaction status:', error.message);
    return false;
  }
}

/**
 * Updates the status of a subscription in the database
 * @param {string} subscriptionId - The ID of the subscription to update
 * @param {string} status - The new status ('active', 'payment_failed', etc.)
 * @param {boolean} paymentConfirmed - Whether payment has been confirmed
 * @param {string} subscriptionType - Optional subscription type to update
 * @returns {boolean} - Whether the update was successful
 */
async function updateSubscriptionStatus(subscriptionId, status, paymentConfirmed = false, subscriptionType = null) {
  try {
    // Prepare parameters for the update query
    const params = [status, paymentConfirmed ? 1 : 0, subscriptionId];
    
    // Start with base update clause
    let startDateClause = '';
    
    // For active subscriptions, set the start date to now
    if (status === 'active') {
      startDateClause = ', started_date = NOW()';
      
      // Also calculate expiry date based on subscription_type
      let subscriptionData;
      
      // If subscription type is provided, use it directly
      if (subscriptionType) {
        console.log(`Using provided subscription type for expiry calculation: ${subscriptionType}`);
      } else {
        // Otherwise query the database for the subscription type
        subscriptionData = await executeQuery('SELECT subscription_type FROM subscriptions WHERE id = ?', [subscriptionId]);
        if (subscriptionData && subscriptionData.length > 0) {
          subscriptionType = subscriptionData[0].subscription_type;
        }
      }
      
      // Calculate expiry based on subscription type
      let expirySql = '';
      if (subscriptionType === 'yearly') {
        expirySql = ', expired_date = DATE_ADD(NOW(), INTERVAL 1 YEAR)';
        console.log('Setting YEARLY expiration date for subscription:', subscriptionId);
      } else if (subscriptionType === 'monthly') {
        expirySql = ', expired_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)';
        console.log('Setting MONTHLY expiration date for subscription:', subscriptionId);
      } else if (subscriptionType === 'weekly') {
        expirySql = ', expired_date = DATE_ADD(NOW(), INTERVAL 1 WEEK)';
        console.log('Setting WEEKLY expiration date for subscription:', subscriptionId);
      }
      
      startDateClause += expirySql;
      
      // If subscription type is provided, update it in the database
      if (subscriptionType) {
        startDateClause += `, subscription_type = '${subscriptionType}'`;
        console.log(`Updating subscription type to: ${subscriptionType}`);
      }
    } else if (status === 'payment_failed' || status === 'failed') {
      // For failed payments, ensure we reset any dates
      startDateClause = ', started_date = NULL, expired_date = NULL';
    }
    
    await executeQuery(`
      UPDATE subscriptions 
      SET status = ?, 
          payment_confirmed = ?,
          updated_at = NOW()
          ${startDateClause}
      WHERE id = ?
    `, params);
    return true;
  } catch (error) {
    console.error('Error updating subscription status:', error.message);
    return false;
  }
}

/**
 * API endpoint to check transaction status
 * This is used by the checkout component to verify payment status
 * and create subscriptions only after successful payment
 */
export async function GET(request) {
  // Default response in case of errors
  let responseData = {
    status: 'unknown',
    message: 'Could not determine transaction status',
    transactionId: null,
    paymentIntentId: null,
    invoiceId: null,
    lastChecked: new Date().toISOString()
  };
  
  try {
    // Get transaction ID, payment intent ID, invoice ID, and subscription ID from query parameters
    const url = new URL(request.url);
    const txnId = url.searchParams.get('txn_id');
    const paymentIntentId = url.searchParams.get('payment_intent_id');
    const invoiceId = url.searchParams.get('invoice_id');
    const subscriptionId = url.searchParams.get('subscription_id');
    const orderNumber = url.searchParams.get('orderNumber');
    const transactionNo = url.searchParams.get('transactionNo');
    // Get subscription type from query parameters
    const subscriptionType = url.searchParams.get('subscriptionType');
    
    // Record these in response data
    responseData.transactionId = txnId || null;
    responseData.paymentIntentId = paymentIntentId || null;
    responseData.invoiceId = invoiceId || null;
    responseData.subscriptionId = subscriptionId || null;
    responseData.orderNumber = orderNumber || null;
    responseData.transactionNo = transactionNo || null;
    responseData.subscriptionType = subscriptionType || null;
    
    if (!txnId && !paymentIntentId && !invoiceId && !subscriptionId && !orderNumber && !transactionNo) {
      responseData.message = 'Missing transaction ID, payment intent ID, invoice ID, subscription ID, or other transaction identifiers';
      return NextResponse.json(responseData, { status: 400 });
    }
    
    // Don't run Paylink verification yet - we'll do that in the main flow
    // This just prepares variables and logs input parameters
    
    console.log(`Checking transaction status for txn_id: ${txnId}, payment_intent_id: ${paymentIntentId}, invoice_id: ${invoiceId}, subscription_id: ${subscriptionId}, orderNumber: ${orderNumber}, transactionNo: ${transactionNo}, subscriptionType: ${subscriptionType}`);
    
    // First, try to find the transaction in our database using all available identifiers
    let dbTransaction = null;
    
    try {
      // Build query to find transaction by any of the available identifiers
      let query = `
        SELECT * FROM payment_transactions 
        WHERE 1=0
      `;
      const params = [];
      
      // Add conditions for each identifier we have
      if (txnId) {
        query += ` OR transaction_id = ? OR order_number = ?`;
        params.push(txnId, txnId);
      }
      
      if (invoiceId) {
        query += ` OR paylink_invoice_id = ?`;
        params.push(invoiceId);
      }
      
      if (transactionNo) {
        query += ` OR transaction_id = ? OR order_number = ?`;
        params.push(transactionNo, transactionNo);
      }
      
      if (orderNumber) {
        query += ` OR order_number = ?`;
        params.push(orderNumber);
      }
      
      query += ` ORDER BY created_at DESC LIMIT 1`;
      
      // Execute the query
      const results = await executeQuery(query, params);
      
      if (results && results.length > 0) {
        dbTransaction = results[0];
        console.log(`Found transaction in database:`, dbTransaction);
        
        // Update response with transaction data
        responseData.transaction = {
          id: dbTransaction.id,
          status: dbTransaction.status,
          created_at: dbTransaction.created_at
        };
        
        // If we found a transaction, use its invoice_id for Paylink verification
        if (dbTransaction.paylink_invoice_id && !invoiceId) {
          invoiceId = dbTransaction.paylink_invoice_id;
          console.log(`Using transaction's paylink_invoice_id for verification: ${invoiceId}`);
        }
        
        // Also use transaction number for verification if available
        if (dbTransaction.transaction_no && !transactionNo) {
          transactionNo = dbTransaction.transaction_no;
          console.log(`Using transaction's transaction_no for verification: ${transactionNo}`);
        }
      } else {
        console.log(`No transaction found in database with provided identifiers`);
      }
    } catch (dbError) {
      console.error('Error querying transaction from database:', dbError);
    }
    
    // Check if we need to verify with Paylink API
    let paylinkVerified = false;
    let paylinkStatus = null;
    
    // Verify with Paylink API if we have an invoice_id or transactionNo
    if (invoiceId || transactionNo) {
      try {
        // Verify Paylink configuration
        const configStatus = validateConfig();
        if (configStatus.isValid) {
          let paymentDetails = null;
          
          // Try to verify by transaction number first (more reliable method)
          if (transactionNo) {
            console.log(`Verifying payment with transactionNo: ${transactionNo}`);
            const transactionDetails = await getTransactionByNumber(transactionNo);
            
            if (transactionDetails && transactionDetails.data) {
              paymentDetails = transactionDetails.data;
              paylinkStatus = paymentDetails.status?.toLowerCase() || '';
              console.log(`Paylink status for transaction ${transactionNo}: ${paylinkStatus}`);
              console.log(`Raw Paylink transaction response:`, JSON.stringify(transactionDetails, null, 2));
            } else {
              console.log(`No transaction found with transactionNo: ${transactionNo}`);
            }
          }
          
          // If transaction verification failed or we don't have a transaction number, try invoice ID
          if (!paymentDetails && invoiceId) {
            console.log(`Verifying payment with invoiceId: ${invoiceId}`);
            const invoiceDetails = await getInvoice(invoiceId);
            
            if (invoiceDetails && invoiceDetails.data) {
              paymentDetails = invoiceDetails.data;
              paylinkStatus = paymentDetails.status?.toLowerCase() || '';
              console.log(`Paylink status for invoice ${invoiceId}: ${paylinkStatus}`);
              console.log(`Raw Paylink invoice response:`, JSON.stringify(invoiceDetails, null, 2));
            } else {
              console.log(`No invoice found with invoiceId: ${invoiceId}`);
            }
          }
          
          // If we have payment details from either method, process them
          if (paymentDetails) {
            // For debugging - extract and log full payment details
            console.log(`Paylink payment details:`, {
              status: paymentDetails.status,
              amount: paymentDetails.amount,
              currency: paymentDetails.currency,
              reference: paymentDetails.reference,
              createdDate: paymentDetails.createdDate,
              paidDate: paymentDetails.paidDate,
              transactionNo: paymentDetails.transactionNo,
              invoiceId: paymentDetails.id || paymentDetails.invoiceId
            });
            
            // IMPORTANT: Check the ACTUAL payment status from Paylink
            // Only consider it paid if Paylink explicitly says it's paid
            // Do NOT trust URL parameters from the redirect as they can be manipulated
            if ((paylinkStatus === 'paid' || paylinkStatus === 'completed') && paymentDetails.paidDate) {
              paylinkVerified = true;
              responseData.status = 'completed';
              responseData.paylinkStatus = paylinkStatus;
              responseData.message = 'Payment confirmed by Paylink';
              
              // Check if we need to create a subscription from this payment
              if (paymentIntentId || txnId) {
                try {
                  // Check if a subscription already exists for this payment
                  const subscriptionCheck = await safeQuery(async () => {
                    let query = 'SELECT id FROM subscriptions WHERE ';
                    let params = [];
                    
                    if (txnId) {
                      query += 'transaction_id = ?';
                      params.push(txnId);
                    } else if (paymentIntentId) {
                      query += 'payment_intent_id = ?';
                      params.push(paymentIntentId);
                    }
                    
                    return executeQuery(query, params);
                  });
                  
                  // If no subscription exists, create one now
                  if (!subscriptionCheck || subscriptionCheck.length === 0) {
                    console.log('No subscription found for verified payment. Creating now...');
                    
                    try {
                      // Get payment intent details
                      const paymentIntentQuery = await safeQuery(async () => {
                        // Since payment_intent table doesn't exist, we'll check for transaction details
                        // in payment_transactions table instead
                        let query = 'SELECT * FROM payment_transactions WHERE ';
                        let params = [];
                        
                        if (paymentIntentId) {
                          query += 'id = ?';
                          params.push(paymentIntentId);
                        } else if (txnId) {
                          query += 'transaction_id = ? OR order_number = ?';
                          params.push(txnId, txnId);
                        }
                        
                        return executeQuery(query, params);
                      });
                      
                      if (paymentIntentQuery && paymentIntentQuery.length > 0) {
                        const paymentIntent = paymentIntentQuery[0];
                        
                        // Get subscription type from URL query parameters if available
                        const urlParams = new URL(request.url).searchParams;
                        const urlSubscriptionType = urlParams.get('subscriptionType');
                        const urlAmount = urlParams.get('amount');
                        
                        console.log('URL PARAMETERS:', {
                          subscriptionType: urlSubscriptionType,
                          amount: urlAmount
                        });
                        
                        // Determine the amount and subscription type with better fallbacks
                        const finalAmount = urlAmount || paymentIntent.amount || paymentDetails?.amount || null;
                        const finalSubscriptionType = urlSubscriptionType || 
                                                        requestData?.subscriptionType || 
                                                        paymentDetails?.subscriptionType || 
                                                        paymentIntent.subscription_type || 
                                                        'monthly';
                        
                        // Add enhanced debug logging
                        console.log('Creating subscription with enhanced data:', {
                          paymentIntentId: paymentIntent.id,
                          transactionId: txnId,
                          invoiceId: invoiceId,
                          amount: finalAmount,
                          subscriptionType: finalSubscriptionType,
                          // Log all possible sources to help debugging
                          amountSources: {
                            fromUrl: urlAmount,
                            fromPaymentIntent: paymentIntent.amount,
                            fromPaymentDetails: paymentDetails?.amount
                          },
                          typeSources: {
                            fromUrl: urlSubscriptionType,
                            fromRequestData: requestData?.subscriptionType,
                            fromPaymentDetails: paymentDetails?.subscriptionType,
                            fromPaymentIntent: paymentIntent.subscription_type
                          }
                        });
                        
                        // Make API call to create subscription
                        const createResponse = await fetch(`${url.origin}/api/subscriptions/create-from-payment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            paymentIntentId: paymentIntent.id,
                            transactionId: txnId,
                            invoiceId: invoiceId,
                            planId: paymentIntent.plan_id,
                            subscriptionType: finalSubscriptionType,
                            amount: finalAmount
                          })
                        });
                        
                        if (createResponse.ok) {
                          const subscriptionData = await createResponse.json();
                          console.log('Subscription created successfully:', subscriptionData);
                          responseData.subscription = subscriptionData.subscription;
                          responseData.message = 'Payment confirmed and subscription created successfully';
                        } else {
                          const errorData = await createResponse.json().catch(() => ({}));
                          console.error('Failed to create subscription from payment intent:', errorData);
                          responseData.subscriptionError = errorData.error || 'Failed to create subscription';
                        }
                      } else {
                        console.log('No payment intent found for:', { paymentIntentId, txnId });
                      }
                    } catch (createError) {
                      console.error('Error creating subscription from verified payment:', createError);
                    }
                  } else {
                    // Subscription already exists, fetch its details
                    const subscriptionData = await safeQuery(async () => {
                      return executeQuery('SELECT * FROM subscriptions WHERE id = ?', [subscriptionCheck[0].id]);
                    });
                    
                    if (subscriptionData && subscriptionData.length > 0) {
                      responseData.subscription = subscriptionData[0];
                      responseData.message = 'Payment confirmed and subscription found';
                    }
                  }
                } catch (subscriptionError) {
                  console.error('Error checking/creating subscription:', subscriptionError);
                }
              }
              
              // If payment failed, update status accordingly
            } else if (paylinkStatus === 'failed' || paylinkStatus === 'cancelled' || paylinkStatus === 'expired') {
              responseData.status = 'failed';
              responseData.paylinkStatus = paylinkStatus;
              responseData.message = `Payment ${paylinkStatus} according to Paylink`;
            } else {
              // Payment is still pending
              responseData.status = 'pending';
              responseData.paylinkStatus = paylinkStatus;
              responseData.message = 'Payment is still being processed by Paylink';
            }
            
            // Return early if we have a definitive status from Paylink
            if (responseData.status !== 'unknown') {
              return NextResponse.json(responseData);
            }
          }
        }
      } catch (paylinkError) {
        console.error('Error checking with Paylink API:', paylinkError);
        responseData.paylinkError = paylinkError.message || 'Unknown Paylink API error';
      }
    }
    
    // If Paylink verification didn't give us a definitive answer, check the database
    // Find the transaction in our database with safe query handling
    let queryParams = [];
    let whereClause = '';
    
    if (txnId && paymentIntentId) {
      whereClause = 'WHERE (transaction_id = ? OR order_number = ?) OR id = ?';
      queryParams = [txnId, txnId, paymentIntentId];
    } else if (txnId) {
      whereClause = 'WHERE transaction_id = ? OR order_number = ?';
      queryParams = [txnId, txnId];
    } else if (paymentIntentId) {
      whereClause = 'WHERE id = ?';
      queryParams = [paymentIntentId];
    }
    
    // Safely execute the database query
    const transactionResults = await safeQuery(async () => {
      return executeQuery(`
        SELECT * FROM payment_transactions 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 1
      `, queryParams);
    });
    
    // Handle case where transaction isn't found or query failed
    if (!transactionResults || !transactionResults.length) {
      // Instead of immediately returning 404, check if we have a subscription ID
      // and try to find the subscription directly
      if (subscriptionId) {
        console.log(`Transaction not found in database, checking subscription directly with ID: ${subscriptionId}`);
        try {
          const subscriptionResults = await safeQuery(async () => {
            return executeQuery(`
              SELECT * FROM subscriptions 
              WHERE id = ?
            `, [subscriptionId]);
          });
          
          if (subscriptionResults && subscriptionResults.length > 0) {
            const subscription = subscriptionResults[0];
            
            // We found the subscription even though transaction wasn't found
            responseData.subscription = {
              id: subscription.id,
              status: subscription.status,
              plan_name: subscription.plan_name || null,
              plan_id: subscription.plan_id || null,
              payment_confirmed: subscription.payment_confirmed ? true : false,
              started_date: subscription.started_date,
              expired_date: subscription.expired_date,
              transaction_id: subscription.transaction_id || null
            };
            
            // Update response status based on subscription status
            if (subscription.status === 'active' && subscription.payment_confirmed) {
              responseData.status = 'completed';
              responseData.message = 'Subscription is active (transaction details not found)';
              return NextResponse.json(responseData);
            } else if (subscription.status === 'payment_failed' || subscription.status === 'failed') {
              responseData.status = 'failed';
              responseData.message = 'Payment failed for this subscription';
              return NextResponse.json(responseData);
            } else if (subscription.status === 'pending') {
              // If we find a pending subscription but no transaction,
              // check if it has a transaction ID we can use to check with Paylink
              if (subscription.transaction_id) {
                // Try to check with Paylink API directly using the subscription's transaction ID
                try {
                  const configStatus = validateConfig();
                  if (configStatus.isValid) {
                    // If subscription has a transaction_id that matches a Paylink reference, check it
                    const invoiceId = subscription.transaction_id;
                    const invoiceDetails = await getInvoice(invoiceId);
                    
                    if (invoiceDetails && invoiceDetails.data) {
                      const paylinkStatus = invoiceDetails.data.status?.toLowerCase() || '';
                      console.log(`Direct Paylink check for subscription ${subscriptionId}: ${paylinkStatus}`);
                      
                      if (paylinkStatus === 'paid' || paylinkStatus === 'completed') {
                        // Payment was actually completed, update subscription
                        await updateSubscriptionStatus(subscriptionId, 'active', true, subscriptionType);
                        responseData.status = 'completed';
                        responseData.message = 'Payment confirmed via direct Paylink check';
                        return NextResponse.json(responseData);
                      } else if (paylinkStatus === 'failed' || paylinkStatus === 'cancelled' || paylinkStatus === 'expired') {
                        // Payment failed, update subscription
                        await updateSubscriptionStatus(subscriptionId, 'payment_failed', false, subscriptionType);
                        responseData.status = 'failed';
                        responseData.message = 'Payment failed via direct Paylink check';
                        return NextResponse.json(responseData);
                      }
                    }
                  }
                } catch (directCheckError) {
                  console.error('Error in direct Paylink check:', directCheckError);
                }
              }
            }
          }
        } catch (subQueryError) {
          console.error('Error checking subscription directly:', subQueryError);
        }
      }
      
      // If we reach here, we couldn't find valid transaction or subscription info
      responseData.message = 'Transaction not found';
      responseData.status = 'not_found';
      // Return 200 status with not_found in the payload instead of 404
      // This allows the frontend to handle it better
      return NextResponse.json(responseData);
    }
    
    const transaction = transactionResults[0];
    responseData.status = transaction.status || 'unknown';
    responseData.transaction = {
      id: transaction.id,
      status: transaction.status,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    };
    
    // If transaction is pending, check with Paylink API for latest status
    if (transaction.status === 'pending' && transaction.paylink_invoice_id) {
      try {
        console.log(`Checking Paylink status for invoice: ${transaction.paylink_invoice_id}`);
        
        // Verify Paylink configuration
        const configStatus = validateConfig();
        if (!configStatus.isValid) {
          console.warn('Paylink configuration is invalid, skipping status check');
        } else {
          // Get invoice details from Paylink with error handling
          const invoiceDetails = await getInvoice(transaction.paylink_invoice_id);
          
          // Make sure we have valid data before proceeding
          if (invoiceDetails && invoiceDetails.data) {
            const paylinkStatus = invoiceDetails.data.status?.toLowerCase() || '';
            console.log(`Paylink status for invoice ${transaction.paylink_invoice_id}: ${paylinkStatus}`);
            
            // Check if payment is now completed
            if (paylinkStatus === 'paid' || paylinkStatus === 'completed') {
              // Use individual update functions that handle errors internally
              const txnUpdated = await updateTransactionStatus(
                transaction.id, 
                'completed', 
                invoiceDetails.data
              );
              
              // Extract subscription type from transaction data or payment gateway response
              let subscriptionTypeToUse = null;
              try {
                if (transaction.payment_gateway_response) {
                  const responseData = JSON.parse(transaction.payment_gateway_response);
                  if (responseData.subscriptionType) {
                    subscriptionTypeToUse = responseData.subscriptionType;
                    console.log('Found subscription type in payment gateway response:', subscriptionTypeToUse);
                  } else if (responseData.metadata && responseData.metadata.subscriptionType) {
                    subscriptionTypeToUse = responseData.metadata.subscriptionType;
                    console.log('Found subscription type in payment gateway metadata:', subscriptionTypeToUse);
                  }
                }
              } catch (parseError) {
                console.error('Error parsing payment gateway response:', parseError);
              }
              
              // If we still don't have a subscription type, check URL parameters
              if (!subscriptionTypeToUse) {
                subscriptionTypeToUse = url.searchParams.get('subscriptionType');
                if (subscriptionTypeToUse) {
                  console.log('Using subscription type from URL parameters:', subscriptionTypeToUse);
                }
              }
              
              if (txnUpdated && transaction.subscription_id) {
                await updateSubscriptionStatus(
                  transaction.subscription_id, 
                  'active', 
                  true, // payment confirmed
                  subscriptionTypeToUse
                );
              }
              
              // Update response data
              responseData.status = 'completed';
              transaction.status = 'completed';
              
              // If we have a subscription type, include it in the response
              if (subscriptionTypeToUse) {
                responseData.subscriptionType = subscriptionTypeToUse;
              }
            } else if (paylinkStatus === 'failed' || paylinkStatus === 'cancelled' || paylinkStatus === 'expired') {
              // Use individual update functions that handle errors internally
              const txnUpdated = await updateTransactionStatus(
                transaction.id, 
                'failed', 
                invoiceDetails.data
              );
              
              if (txnUpdated && transaction.subscription_id) {
                await updateSubscriptionStatus(
                  transaction.subscription_id, 
                  'payment_failed', 
                  false, // payment not confirmed
                  subscriptionTypeToUse
                );
              }
              
              // Update response data
              responseData.status = 'failed';
              transaction.status = 'failed';
            }
          } else {
            console.warn('No valid data returned from Paylink API');
          }
        }
      } catch (paylinkError) {
        console.error('Error checking with Paylink API:', paylinkError);
        // Set error info but continue with local status
        responseData.paylinkError = paylinkError.message || 'Unknown Paylink API error';
      }
    }
    
    // If we have a subscription ID, get the subscription details
    let subscription = null;
    if (transaction.subscription_id) {
      try {
        const subscriptionResults = await safeQuery(async () => {
          return executeQuery(`
            SELECT * FROM subscriptions 
            WHERE id = ?
          `, [transaction.subscription_id]);
        });
        
        if (subscriptionResults && subscriptionResults.length > 0) {
          subscription = subscriptionResults[0];
          responseData.subscription = {
            id: subscription.id,
            status: subscription.status,
            plan_name: subscription.plan_name || null,
            plan_id: subscription.plan_id || null,
            payment_confirmed: subscription.payment_confirmed ? true : false,
            started_date: subscription.started_date,
            expired_date: subscription.expired_date
          };
        }
      } catch (subError) {
        console.error('Error fetching subscription details:', subError);
        responseData.subscriptionError = 'Could not retrieve subscription details';
      }
    }
    
    // Always use the most up-to-date status from the transaction
    responseData.status = transaction.status || 'unknown';
    responseData.message = 'Transaction status retrieved successfully';
    responseData.lastUpdated = transaction.updated_at || new Date().toISOString();
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error checking transaction status:', error);
    
    // Always return a 200 response with error details to prevent frontend crashes
    responseData.status = 'error';
    responseData.message = 'Error checking transaction status';
    responseData.error = error.message || 'Unknown error';
    responseData.stack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    
    return NextResponse.json(responseData, { status: 200 });
  }
}
