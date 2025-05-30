import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';

// GET handler to clear all subscription plans
export async function GET() {
  try {
    // Delete all plans from the database
    await executeQuery('DELETE FROM subscription_plans');
    
    return NextResponse.json(
      { message: 'Successfully cleared all subscription plans' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing plans:', error);
    return NextResponse.json(
      { error: 'Failed to clear plans', details: error.message },
      { status: 500 }
    );
  }
}
