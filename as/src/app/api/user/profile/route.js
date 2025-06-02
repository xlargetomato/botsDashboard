import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyToken } from '@/lib/auth/authUtils';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Headers for all responses
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

// Helper function to verify authentication
async function verifyAuth() {
  const cookieStore = cookies();
  // Await the cookieStore.get method to properly handle the async operation
  const token = (await cookieStore.get('auth_token'))?.value;
  
  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }
  
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return { error: 'Invalid authentication token', status: 401 };
  }
  
  return { userId: decoded.userId };
}

export async function GET(request) {
  try {
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error, authenticated: false },
        { status: auth.status, headers }
      );
    }
    
    try {
      // Get user data from database
      const users = await executeQuery(
        'SELECT id, name, email, verified, created_at FROM users WHERE id = ?',
        [auth.userId]
      );
      
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found', authenticated: false },
          { status: 404, headers }
        );
      }
      
      const user = users[0];
      
      // Return user profile data (excluding sensitive information)
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified === 1, // Convert from MySQL boolean to JS boolean
        createdAt: user.created_at,
        authenticated: true
      }, { headers });
    } catch (dbError) {
      console.error('Database error fetching user profile:', dbError);
      return NextResponse.json(
        { error: 'Database error', authenticated: false },
        { status: 500, headers }
      );
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', authenticated: false },
      { status: 500, headers }
    );
  }
}

export async function PUT(request) {
  try {
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error, authenticated: false },
        { status: auth.status, headers }
      );
    }

    const data = await request.json();
    const { name, email, currentPassword, newPassword } = data;

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400, headers }
      );
    }

    // Get current user data
    const users = await executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [auth.userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers }
      );
    }

    const user = users[0];

    // If updating password, verify current password
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400, headers }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user with new password
      await executeQuery(
        'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
        [name, email, hashedPassword, auth.userId]
      );
    } else {
      // Update user without changing password
      await executeQuery(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, auth.userId]
      );
    }

    // Get updated user data
    const updatedUsers = await executeQuery(
      'SELECT id, name, email, verified, created_at FROM users WHERE id = ?',
      [auth.userId]
    );

    const updatedUser = updatedUsers[0];

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        verified: updatedUser.verified === 1,
        createdAt: updatedUser.created_at
      }
    }, { headers });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}
