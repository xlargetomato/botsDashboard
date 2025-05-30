import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

/**
 * API endpoint to update transaction details
 * This ensures we use the correct database field names that exist in the schema
 */
export async function POST(request) {
  try {
    // Get transaction data from request body
    const data = await request.json();
    
    // Required fields
    const { transaction_id, subscription_id, invoice_id, payment_url } = data;
    
    if (!transaction_id || !subscription_id) {
      return NextResponse.json(
        { error: 'Missing required transaction or subscription ID' },
        { status: 400 }
      );
    }
    
    // Check if transaction exists
    const existingTransactions = await executeQuery(`
      SELECT * FROM payment_transactions 
      WHERE transaction_id = ? AND subscription_id = ?
    `, [transaction_id, subscription_id]);
    
    if (existingTransactions.length === 0) {
      // Transaction doesn't exist, we need to create it
      await executeQuery(`
        INSERT INTO payment_transactions 
        (transaction_id, subscription_id, invoice_reference, payment_url, status, gateway_response, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, NOW(), NOW())
      `, [
        transaction_id,
        subscription_id,
        invoice_id,
        payment_url,
        JSON.stringify(data.gateway_response || {})
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Payment transaction created'
      });
    } else {
      // Transaction exists, update it
      const transaction = existingTransactions[0];
      
      // Use correct column names from the database
      await executeQuery(`
        UPDATE payment_transactions 
        SET 
          invoice_reference = ?,
          payment_url = ?,
          gateway_response = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        invoice_id,
        payment_url,
        JSON.stringify(data.gateway_response || {}),
        transaction.id
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Payment transaction updated'
      });
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update transaction',
        message: error.message
      },
      { status: 500 }
    );
  }
}
