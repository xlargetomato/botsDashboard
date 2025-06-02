import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';

// Get a specific FAQ
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const faq = await executeQuery(
      'SELECT * FROM faqs WHERE id = ?',
      [id]
    );
    
    if (!faq || faq.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FAQ not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: faq[0]
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch FAQ'
    }, { status: 500 });
  }
}

// Update a FAQ
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log(`Updating FAQ ${id} with data:`, body);
    
    // Validate required fields
    if (body.question_en === '' || body.question_ar === '' || body.answer_en === '' || body.answer_ar === '') {
      return NextResponse.json({
        success: false,
        error: 'Question and answer are required in both languages'
      }, { status: 400 });
    }
    
    // Check if FAQ exists
    const existingFaq = await executeQuery(
      'SELECT * FROM faqs WHERE id = ?',
      [id]
    );
    
    if (!existingFaq || existingFaq.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FAQ not found'
      }, { status: 404 });
    }
    
    // Prepare update data with proper type handling
    const updateData = {
      question_en: body.question_en || existingFaq[0].question_en,
      question_ar: body.question_ar || existingFaq[0].question_ar,
      answer_en: body.answer_en || existingFaq[0].answer_en,
      answer_ar: body.answer_ar || existingFaq[0].answer_ar,
      order_index: body.order_index !== undefined ? parseInt(body.order_index) : existingFaq[0].order_index,
      is_active: body.is_active !== undefined ? (body.is_active === false ? 0 : 1) : existingFaq[0].is_active
    };
    
    console.log('Update with values:', updateData);
    
    // Update FAQ
    const result = await executeQuery(
      `UPDATE faqs 
       SET question_en = ?, question_ar = ?, answer_en = ?, answer_ar = ?, 
           order_index = ?, is_active = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        updateData.question_en,
        updateData.question_ar,
        updateData.answer_en,
        updateData.answer_ar,
        updateData.order_index,
        updateData.is_active,
        id
      ]
    );
    
    console.log('Update result:', result);
    
    return NextResponse.json({
      success: true,
      data: { 
        id, 
        ...updateData,
        is_active: Boolean(updateData.is_active)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to update FAQ: ${error.message}`
    }, { status: 500 });
  }
}

// Delete a FAQ
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Check if FAQ exists
    const existingFaq = await executeQuery(
      'SELECT id FROM faqs WHERE id = ?',
      [id]
    );
    
    if (!existingFaq || existingFaq.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FAQ not found'
      }, { status: 404 });
    }
    
    // Delete FAQ
    await executeQuery(
      'DELETE FROM faqs WHERE id = ?',
      [id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete FAQ'
    }, { status: 500 });
  }
}