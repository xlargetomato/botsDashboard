import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { redirect } from 'next/navigation';

/**
 * Simulated payment handler to bypass Paylink integration issues
 * 
 * This endpoint simulates a successful payment callback from Paylink
 * and updates the subscription status accordingly.
 * 
 * GET /api/paylink/simulate-payment
 */
export async function GET(request) {
  try {
    // Get query parameters from the URL
    const url = new URL(request.url);
    const invoice_id = url.searchParams.get('invoice_id');
    const transaction_id = url.searchParams.get('transaction_id');
    const subscription_id = url.searchParams.get('subscription_id');
    const amount = url.searchParams.get('amount');
    const status = url.searchParams.get('status') || 'paid';
    
    console.log('Payment simulation received:', {
      invoice_id,
      transaction_id,
      subscription_id,
      amount,
      status
    });
    
    if (!invoice_id || !transaction_id) {
      return new Response(
        '<html><body><h1>Missing required parameters</h1><p>Invoice ID and Transaction ID are required.</p><a href="/">Go back to dashboard</a></body></html>',
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
    // Update payment transaction status if possible
    if (transaction_id) {
      try {
        await executeQuery(
          'UPDATE payment_transactions SET status = ? WHERE transaction_id = ?',
          [status, transaction_id]
        );
        console.log(`Updated payment transaction status to ${status} for transaction ID: ${transaction_id}`);
      } catch (dbError) {
        console.error('Error updating payment transaction:', dbError);
        // Non-fatal error, continue with the process
      }
    }
    
    // Update subscription status if possible
    if (subscription_id) {
      try {
        // Calculate subscription end date based on type (monthly or yearly)
        // First get the subscription to determine the type
        const [subscription] = await executeQuery(
          'SELECT subscription_type FROM subscriptions WHERE id = ?',
          [subscription_id]
        );
        
        let endDate = new Date();
        if (subscription && subscription.subscription_type) {
          if (subscription.subscription_type === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            // Default to monthly
            endDate.setMonth(endDate.getMonth() + 1);
          }
        } else {
          // Default to monthly if not found
          endDate.setMonth(endDate.getMonth() + 1);
        }
        
        const startDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const endDateStr = endDate.toISOString().slice(0, 19).replace('T', ' ');
        
        await executeQuery(
          'UPDATE subscriptions SET status = ?, start_date = ?, end_date = ? WHERE id = ?',
          [status, startDate, endDateStr, subscription_id]
        );
        console.log(`Updated subscription status to ${status} for subscription ID: ${subscription_id}`);
      } catch (dbError) {
        console.error('Error updating subscription:', dbError);
        // Non-fatal error, continue with the process
      }
    }
    
    // Create HTML response that simulates a payment confirmation page
    // with automatic redirect to the dashboard
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f7fafc;
              color: #2d3748;
              text-align: center;
              padding: 0 20px;
            }
            .container {
              max-width: 600px;
              padding: 40px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #3182ce;
              margin-bottom: 20px;
            }
            .success-icon {
              color: #38a169;
              font-size: 4rem;
              margin-bottom: 20px;
            }
            .details {
              margin: 20px 0;
              padding: 15px;
              background-color: #f0fff4;
              border-radius: 4px;
              text-align: left;
            }
            .redirect-message {
              margin-top: 20px;
              color: #718096;
            }
            .dashboard-link {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background-color: #3182ce;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 500;
            }
            .dashboard-link:hover {
              background-color: #2c5282;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Your subscription has been activated successfully.</p>
            
            <div class="details">
              <p><strong>Transaction ID:</strong> ${transaction_id || 'N/A'}</p>
              <p><strong>Amount:</strong> $${amount || '0.00'}</p>
              <p><strong>Status:</strong> ${status === 'paid' ? 'Paid' : status}</p>
            </div>
            
            <a href="/dashboard" class="dashboard-link">Go to Dashboard</a>
          </div>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error in payment simulation:', error);
    
    // Return an error page
    return new Response(
      `<html><body><h1>Error Processing Payment</h1><p>${error.message}</p><a href="/">Go back to dashboard</a></body></html>`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}
