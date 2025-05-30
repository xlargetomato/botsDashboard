import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';

// Get all active FAQs for client-side display
export async function GET(request) {
  try {
    const faqs = await executeQuery(
      'SELECT * FROM faqs WHERE is_active = 1 ORDER BY order_index ASC, created_at DESC',
      []
    );
    
    return NextResponse.json({
      success: true,
      data: faqs
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch FAQs'
    }, { status: 500 });
  }
}