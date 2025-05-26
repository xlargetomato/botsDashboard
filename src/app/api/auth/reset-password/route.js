import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { hashPassword, isStrongPassword } from '@/lib/auth/authUtils';

export async function POST(request) {
  try {
    const data = await request.json();
    const { token, password } = data;
    
    // Basic validation
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }
    
    // Find the user with this reset token
    const users = await executeQuery(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    const user = users[0];
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update user's password and clear the reset token
    await executeQuery(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
