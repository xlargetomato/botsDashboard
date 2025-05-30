import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { generateResetToken, getResetTokenExpiry } from '@/lib/auth/authUtils';
import { sendPasswordResetEmail } from '@/lib/email/emailService';

export async function POST(request) {
  try {
    const data = await request.json();
    const { email } = data;
    
    // Basic validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const users = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // For security reasons, don't reveal that the email doesn't exist
      // Instead, pretend we sent an email
      return NextResponse.json(
        { message: 'If a user with this email exists, a password reset link has been sent' },
        { status: 200 }
      );
    }
    
    const user = users[0];
    
    // Generate reset token and expiry
    const resetToken = generateResetToken();
    const tokenExpiry = getResetTokenExpiry();
    
    // Update user with reset token
    await executeQuery(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, tokenExpiry, user.id]
    );
    
    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.name);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Password reset link has been sent to your email' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
