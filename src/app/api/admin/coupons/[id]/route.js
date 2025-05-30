import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';

// DELETE - Delete a coupon by ID
export async function DELETE(request, { params }) {
  try {
    // Get the coupon ID from the URL parameters
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Check if the coupon exists
    const [existingCoupon] = await executeQuery(
      'SELECT id FROM coupons WHERE id = ?',
      [id]
    );

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Delete the coupon
    await executeQuery(
      'DELETE FROM coupons WHERE id = ?',
      [id]
    );

    return NextResponse.json(
      { success: true, message: 'Coupon deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a coupon by ID
export async function PUT(request, { params }) {
  try {
    // Get the coupon ID from the URL parameters
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Parse request body
    const { 
      code, 
      discount_type, 
      discount_value, 
      valid_from,
      valid_until,
      max_uses,
      is_active
    } = await request.json();

    // Check if the coupon exists
    const [existingCoupon] = await executeQuery(
      'SELECT id, code FROM coupons WHERE id = ?',
      [id]
    );

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // If code is being changed, check if the new code already exists
    if (code && code !== existingCoupon.code) {
      const [existingCode] = await executeQuery(
        'SELECT id FROM coupons WHERE code = ? AND id != ?',
        [code, id]
      );
      
      if (existingCode) {
        return NextResponse.json(
          { error: 'A coupon with this code already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update fields and values
    const updateFields = [];
    const updateValues = [];

    if (code) {
      updateFields.push('code = ?');
      updateValues.push(code);
    }

    if (discount_type) {
      updateFields.push('discount_type = ?');
      updateValues.push(discount_type);
    }

    if (discount_value !== undefined) {
      updateFields.push('discount_value = ?');
      updateValues.push(parseFloat(discount_value));
    }

    if (valid_until) {
      updateFields.push('expiry_date = ?');
      updateValues.push(valid_until);
    }

    if (max_uses !== undefined) {
      updateFields.push('max_uses = ?');
      updateValues.push(parseInt(max_uses) || 0);
    }

    if (is_active !== undefined) {
      updateFields.push('active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    // Add updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date());

    // Add ID to values array for WHERE clause
    updateValues.push(id);

    // Update the coupon
    if (updateFields.length > 0) {
      await executeQuery(
        `UPDATE coupons SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Fetch the updated coupon
    const [updatedCoupon] = await executeQuery(
      'SELECT * FROM coupons WHERE id = ?',
      [id]
    );

    // Format the response
    const formattedCoupon = {
      id: updatedCoupon.id,
      code: updatedCoupon.code,
      discount_type: updatedCoupon.discount_type,
      discount_value: parseFloat(updatedCoupon.discount_value),
      valid_until: updatedCoupon.expiry_date,
      max_uses: updatedCoupon.max_uses,
      current_uses: updatedCoupon.used_count,
      is_active: updatedCoupon.active === 1,
      created_at: updatedCoupon.created_at,
      updated_at: updatedCoupon.updated_at
    };

    return NextResponse.json(formattedCoupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Get a single coupon by ID
export async function GET(request, { params }) {
  try {
    // Get the coupon ID from the URL parameters
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Fetch the coupon
    const [coupon] = await executeQuery(
      'SELECT * FROM coupons WHERE id = ?',
      [id]
    );

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedCoupon = {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: parseFloat(coupon.discount_value),
      valid_until: coupon.expiry_date,
      max_uses: coupon.max_uses,
      current_uses: coupon.used_count,
      is_active: coupon.active === 1,
      created_at: coupon.created_at
    };

    return NextResponse.json(formattedCoupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupon: ' + error.message },
      { status: 500 }
    );
  }
}
