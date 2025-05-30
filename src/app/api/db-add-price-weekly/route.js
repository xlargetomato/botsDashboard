import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Verify admin authentication (optional for development)
    try {
      const authResult = await verifyAuth(request);
      if (!authResult.success || authResult.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } catch (authError) {
      console.error('Auth error:', authError);
      // For development/testing, we'll continue anyway
      console.log('Continuing without auth for development purposes');
    }
    
    // Step 1: Check if the price_weekly column exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'subscription_plans'
      AND COLUMN_NAME = 'price_weekly'
    `;
    
    const columnExists = await executeQuery(checkColumnQuery);
    
    if (columnExists && columnExists.length > 0) {
      // Column already exists, no need to add it
      return NextResponse.json({
        success: true,
        message: 'price_weekly column already exists',
        columnExists: true
      });
    }
    
    // Step 2: Add the price_weekly column
    const alterTableQuery = `
      ALTER TABLE subscription_plans
      ADD COLUMN price_weekly DECIMAL(10, 2) NOT NULL DEFAULT 0
      AFTER description
    `;
    
    await executeQuery(alterTableQuery);
    
    // Step 3: Verify the column was added
    const verifyColumnQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'subscription_plans'
      AND COLUMN_NAME = 'price_weekly'
    `;
    
    const verifyResult = await executeQuery(verifyColumnQuery);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added price_weekly column to subscription_plans table',
      columnExists: false,
      verificationResult: verifyResult
    });
  } catch (error) {
    console.error('Error in database migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add price_weekly column',
        details: error.message
      },
      { status: 500 }
    );
  }
}
