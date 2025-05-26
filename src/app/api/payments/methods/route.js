import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { createPaymentMethodsTable } from '@/lib/db/migrations/payment_methods';

// GET handler to fetch user's saved payment methods
export async function GET(request) {
  try {
    await createPaymentMethodsTable();
    
    // Verify authentication
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Fetch payment methods from the database
    const paymentMethods = await executeQuery(
      'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    
    return NextResponse.json({ paymentMethods }, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST handler to add a new payment method
export async function POST(request) {
  try {
    await createPaymentMethodsTable();
    
    // Verify authentication
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    const { 
      methodType, 
      lastFourDigits, 
      cardBrand, 
      cardHolderName, 
      expiresAt,
      isDefault
    } = await request.json();
    
    // Validate required fields
    if (!methodType) {
      return NextResponse.json(
        { error: 'Method type is required' },
        { status: 400 }
      );
    }
    
    const id = uuidv4();
    
    // If this is set as default, update all other methods to non-default
    if (isDefault) {
      await executeQuery(
        'UPDATE payment_methods SET is_default = FALSE WHERE user_id = ?',
        [userId]
      );
    }
    
    // Insert the new payment method
    await executeQuery(
      `INSERT INTO payment_methods 
       (id, user_id, method_type, last_four_digits, card_brand, card_holder_name, expires_at, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        userId, 
        methodType, 
        lastFourDigits || null, 
        cardBrand || null, 
        cardHolderName || null,
        expiresAt || null,
        isDefault ? 1 : 0
      ]
    );
    
    // Fetch the newly created payment method
    const [newMethod] = await executeQuery(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    
    return NextResponse.json(
      { 
        message: 'Payment method saved successfully', 
        paymentMethod: newMethod
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving payment method:', error);
    return NextResponse.json(
      { error: 'Failed to save payment method' },
      { status: 500 }
    );
  }
}

// DELETE handler to remove a payment method
export async function DELETE(request) {
  try {
    // Verify authentication
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the payment method exists and belongs to the user
    const methods = await executeQuery(
      'SELECT * FROM payment_methods WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!methods || methods.length === 0) {
      return NextResponse.json(
        { error: 'Payment method not found or does not belong to the user' },
        { status: 404 }
      );
    }
    
    // Delete the payment method
    await executeQuery(
      'DELETE FROM payment_methods WHERE id = ?',
      [id]
    );
    
    return NextResponse.json(
      { 
        message: 'Payment method deleted successfully',
        id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
