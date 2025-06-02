import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';
import { generateUUID } from '@/lib/auth/authUtils';
import { generateCouponCode, generateUniqueCouponCode } from '@/lib/utils/couponGenerator';

// GET - Fetch all coupons
export async function GET(request) {
  try {
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

    // Fetch coupons from the database
    try {
      // First, ensure the coupons table exists
      try {
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS coupons (
            id VARCHAR(36) PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type ENUM('percentage', 'fixed') NOT NULL,
            discount_value DECIMAL(10, 2) NOT NULL,
            max_uses INT DEFAULT 0,
            used_count INT DEFAULT 0,
            expiry_date DATETIME NULL,
            active TINYINT(1) DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (tableError) {
        console.error('Error ensuring coupons table exists:', tableError);
        // Continue anyway, as the table might already exist
      }

      // Now fetch the coupons
      const coupons = await executeQuery(
        'SELECT * FROM coupons ORDER BY created_at DESC'
      );
      
      // Format the response
      const formattedCoupons = coupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: parseFloat(coupon.discount_value),
        valid_until: coupon.expiry_date,
        max_uses: coupon.max_uses,
        current_uses: coupon.used_count,
        is_active: coupon.active === 1,
        created_at: coupon.created_at
      }));
      
      return NextResponse.json(formattedCoupons);
    } catch (dbError) {
      console.error('Database error fetching coupons:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch coupons from database: ' + dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST - Create a new coupon
export async function POST(request) {
  try {
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
      code: manualCode, 
      discount_type, 
      discount_value, 
      valid_from,
      valid_until,
      max_uses = 0, 
      is_active = true,
      auto_generate = false,
      code_length = 6
    } = await request.json();

    // Validate required fields
    if ((!manualCode && !auto_generate) || !discount_type || !discount_value) {
      return NextResponse.json(
        { error: 'Discount type, discount value, and either code or auto_generate flag are required' },
        { status: 400 }
      );
    }

    // Generate code if auto_generate is true
    let code = manualCode;
    if (auto_generate) {
      // Check if code already exists
      const checkCodeExists = async (codeToCheck) => {
        try {
          const [existing] = await executeQuery(
            'SELECT id FROM coupons WHERE code = ?',
            [codeToCheck]
          );
          return !!existing;
        } catch (error) {
          console.error('Error checking code existence:', error);
          return false;
        }
      };
      
      // Generate a unique coupon code
      try {
        code = await generateUniqueCouponCode({
          length: code_length,
          checkExists: checkCodeExists,
          maxAttempts: 10
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to generate a unique coupon code after multiple attempts' },
          { status: 500 }
        );
      }
    } else if (manualCode) {
      // Check if manually provided code already exists
      try {
        const [existing] = await executeQuery(
          'SELECT id FROM coupons WHERE code = ?',
          [manualCode]
        );
        
        if (existing) {
          return NextResponse.json(
            { error: 'A coupon with this code already exists' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error checking existing coupon code:', error);
        // If the table doesn't exist yet, we'll create it
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS coupons (
            id VARCHAR(36) PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type ENUM('percentage', 'fixed') NOT NULL,
            discount_value DECIMAL(10, 2) NOT NULL,
            max_uses INT DEFAULT 0,
            used_count INT DEFAULT 0,
            expiry_date DATETIME NULL,
            active TINYINT(1) DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      }
    }

    // Generate a UUID for the new coupon
    const couponId = generateUUID();
    const now = new Date();
    
    // Insert the new coupon into the database
    await executeQuery(
      `INSERT INTO coupons (
        id, code, discount_type, discount_value, 
        max_uses, used_count, expiry_date, 
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        couponId,
        code,
        discount_type,
        parseFloat(discount_value),
        max_uses ? parseInt(max_uses) : 0,
        valid_until || now,
        is_active ? 1 : 0,
        now,
        now
      ]
    );
    
    // Fetch the newly created coupon
    const [newCoupon] = await executeQuery(
      'SELECT * FROM coupons WHERE id = ?',
      [couponId]
    );

    return NextResponse.json(newCoupon, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
