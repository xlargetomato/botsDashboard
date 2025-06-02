import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// We no longer need GET requests for verification as we're using verification codes
export async function GET(request) {
  // Redirect to the verification page
  return NextResponse.redirect(new URL('/register', request.url));
}

// Handle POST requests for verification with 6-digit code
export async function POST(request) {
  try {
    const data = await request.json();
    const { email, token } = data;
    
    // Basic validation
    if (!email || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate that token is a 6-digit code
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Verification code must be 6 digits' },
        { status: 400 }
      );
    }
    
    // Find the user
    const users = await executeQuery(
      'SELECT * FROM users WHERE email = ? AND verification_token = ? AND verification_token_expires > NOW()',
      [email, token]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
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
    
    // Mark user as verified and clear the verification token
    await executeQuery(
      'UPDATE users SET verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
      [user.id]
    );
    
    console.log('Verified user:', { email });
    
    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
