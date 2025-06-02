import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new subscription
 * POST /api/subscriptions/create
 */
export async function POST(request) {
  let userId;

  try {
    // Try to get user ID from auth - but allow testing without auth
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      } else {
        const requestData = await request.clone().json();
        if (requestData.user_id) {
          userId = requestData.user_id;
          console.log(`Using user_id from request body: ${userId} (for testing)`);
        } else {
          return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 401 }
          );
        }
      }
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    const {
      plan_id,
      transaction_id,
      customer_info,
      payment_info,
      promo_code,
      discount_percentage,
      subscription_type,
      status,
      origin
    } = await request.json();

    // Validate required fields
    if (!plan_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', message: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // First, ensure the subscriptions table exists
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          plan_id VARCHAR(36) NOT NULL,
          transaction_id VARCHAR(100),
          customer_name VARCHAR(255),
          customer_email VARCHAR(255),
          customer_phone VARCHAR(50),
          amount_paid DECIMAL(10,2),
          currency VARCHAR(10) DEFAULT 'SAR',
          subscription_type ENUM('monthly', 'yearly') DEFAULT 'monthly',
          promo_code VARCHAR(50),
          discount_percentage DECIMAL(5,2) DEFAULT 0,
          start_date DATETIME,
          end_date DATETIME,
          paylink_invoice_id VARCHAR(100),
          paylink_payment_url VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Ensured subscriptions table exists');
    } catch (tableError) {
      console.warn('Error ensuring subscriptions table (might already exist):', tableError.message);
      // Non-fatal error, continue
    }

    // Generate a unique ID for the subscription
    const subscriptionId = uuidv4();
    
    // Format data for insertion
    const customerName = customer_info?.name || '';
    const customerEmail = customer_info?.email || '';
    const customerPhone = customer_info?.phone || '';
    const amount = payment_info?.amount || 0;
    const currency = payment_info?.currency || 'SAR';
    const subscriptionTypeValue = subscription_type || 'monthly';
    const statusValue = status || 'pending';
    const discountValue = discount_percentage || 0;
    
    // Get the column names dynamically to handle schema variations
    let columns;
    try {
      const tableInfo = await executeQuery('DESCRIBE subscriptions');
      columns = tableInfo.map(col => col.Field);
      console.log('Available columns in subscriptions table:', columns);
    } catch (error) {
      console.warn('Could not get subscription table schema, using default columns');
      columns = [
        'id', 'user_id', 'plan_id', 'transaction_id', 'customer_name', 'customer_email', 
        'customer_phone', 'amount_paid', 'currency', 'subscription_type', 'promo_code',
        'discount_percentage', 'status'
      ];
    }
    
    // Build the SQL query dynamically based on available columns
    let fields = ['id', 'user_id', 'plan_id'];
    let values = [subscriptionId, userId, plan_id];
    let placeholders = ['?', '?', '?'];
    
    // Add optional fields if they exist in the schema
    const fieldMap = {
      'transaction_id': transaction_id,
      'customer_name': customerName,
      'customer_email': customerEmail, 
      'customer_phone': customerPhone,
      'amount_paid': amount,
      'currency': currency,
      'subscription_type': subscriptionTypeValue,
      'promo_code': promo_code,
      'discount_percentage': discountValue,
      'status': statusValue
    };
    
    // If paylink info is provided, add it
    if (payment_info?.paylink_invoice_id && columns.includes('paylink_invoice_id')) {
      fieldMap['paylink_invoice_id'] = payment_info.paylink_invoice_id;
    }
    
    if (payment_info?.paylink_payment_url && columns.includes('paylink_payment_url')) {
      fieldMap['paylink_payment_url'] = payment_info.paylink_payment_url;
    }
    
    // Add fields that exist in the schema
    for (const [field, value] of Object.entries(fieldMap)) {
      if (columns.includes(field) && value !== undefined) {
        fields.push(field);
        values.push(value);
        placeholders.push('?');
      }
    }
    
    // Build and execute the query
    const fieldsStr = fields.join(', ');
    const placeholdersStr = placeholders.join(', ');
    
    const query = `INSERT INTO subscriptions (${fieldsStr}) VALUES (${placeholdersStr})`;
    console.log('Executing subscription creation query:', query);
    
    await executeQuery(query, values);
    
    // Get the created subscription
    const [subscription] = await executeQuery(
      'SELECT * FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );
    
    console.log('Created subscription:', subscription);
    
    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      id: subscriptionId,
      subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create subscription', 
        message: error.message,
        details: {
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        }
      },
      { status: 500 }
    );
  }
}
