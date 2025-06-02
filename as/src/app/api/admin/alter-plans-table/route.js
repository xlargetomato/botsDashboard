import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';

// GET handler to add price_weekly column to subscription_plans table
export async function GET() {
  try {
    // Check if price_weekly column already exists
    const columns = await executeQuery(`
      SHOW COLUMNS FROM subscription_plans LIKE 'price_weekly'
    `);
    
    // If column doesn't exist, add it
    if (columns.length === 0) {
      await executeQuery(`
        ALTER TABLE subscription_plans 
        ADD COLUMN price_weekly DECIMAL(10, 2) NOT NULL DEFAULT 0 
        AFTER description
      `);
      
      return NextResponse.json(
        { message: 'Successfully added price_weekly column to subscription_plans table' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: 'price_weekly column already exists in subscription_plans table' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error altering subscription_plans table:', error);
    return NextResponse.json(
      { error: 'Failed to alter subscription_plans table', details: error.message },
      { status: 500 }
    );
  }
}
