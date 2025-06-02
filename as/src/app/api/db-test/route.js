import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the database connection with a simple query
    const result = await executeQuery('SELECT 1 as test');
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      data: result 
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database connection failed',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
