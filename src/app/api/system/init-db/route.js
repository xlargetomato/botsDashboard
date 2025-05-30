import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/config';

export async function POST() {
  try {
    // Initialize the database
    await initializeDatabase();
    
    return NextResponse.json(
      { message: 'Database initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage
      },
      { status: 500 }
    );
  }
}
