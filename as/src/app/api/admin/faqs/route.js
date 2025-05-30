import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    let query = 'SELECT * FROM faqs';
    const params = [];
    
    if (isActive !== null) {
      query += ' WHERE is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY order_index ASC, created_at DESC';
    
    const faqs = await executeQuery(query, params);
    
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

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Log the incoming request body for debugging
    console.log('Creating FAQ with data:', body);
    
    // Validate required fields
    if (!body.question_en || !body.question_ar || !body.answer_en || !body.answer_ar) {
      return NextResponse.json({
        success: false,
        error: 'Question and answer are required in both languages'
      }, { status: 400 });
    }
    
    // Generate new ID
    const id = uuidv4();
    
    // Parse numeric values and ensure defaults
    const orderIndex = parseInt(body.order_index) || 0;
    const isActive = body.is_active === false ? 0 : 1; // Convert boolean to 0/1 for MySQL
    
    // Log the values being sent to the database
    console.log('Inserting with values:', {
      id, 
      question_en: body.question_en, 
      question_ar: body.question_ar, 
      answer_en: body.answer_en, 
      answer_ar: body.answer_ar, 
      orderIndex, 
      isActive
    });
    
    // Check if table exists first
    const tables = await executeQuery("SHOW TABLES LIKE 'faqs'");
    if (tables.length === 0) {
      console.log('FAQs table does not exist, creating it');
      // Create the table if it doesn't exist
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS faqs (
          id VARCHAR(36) PRIMARY KEY,
          question_en VARCHAR(255) NOT NULL,
          question_ar VARCHAR(255) NOT NULL,
          answer_en TEXT NOT NULL,
          answer_ar TEXT NOT NULL,
          order_index INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Perform the insert with explicit column names
    const result = await executeQuery(
      `INSERT INTO faqs 
       (id, question_en, question_ar, answer_en, answer_ar, order_index, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, body.question_en, body.question_ar, body.answer_en, body.answer_ar, orderIndex, isActive]
    );
    
    console.log('Insert result:', result);
    
    return NextResponse.json({
      success: true,
      data: { 
        id, 
        question_en: body.question_en,
        question_ar: body.question_ar,
        answer_en: body.answer_en,
        answer_ar: body.answer_ar,
        order_index: orderIndex,
        is_active: Boolean(isActive)
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to create FAQ: ${error.message}`
    }, { status: 500 });
  }
}