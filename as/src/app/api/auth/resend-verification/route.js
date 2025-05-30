import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { generateVerificationToken, getVerificationTokenExpiry } from '@/lib/auth/authUtils';
import { sendVerificationEmail } from '@/lib/email/emailService';

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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const user = users[0];
    
    // Check if already verified
    if (user.verified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }
    
    // Generate new 6-digit verification code and expiry
    const verificationCode = generateVerificationToken();
    const tokenExpiry = getVerificationTokenExpiry();
    
    // Update user with new verification code
    await executeQuery(
      'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
      [verificationCode, tokenExpiry, user.id]
    );
    
    // Send verification email with the code
    try {
      await sendVerificationEmail(email, verificationCode, user.name);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
