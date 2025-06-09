import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';

// Redirect GET requests to the verify page with the email parameter
export async function GET(request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const token = url.searchParams.get('token');
    
    console.log('Verification GET request received:', { email, token });
    
    if (!email) {
      console.log('No email provided in verification link, redirecting to login');
      // If no email is provided, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Redirect to the verification page with proper parameters
    const verifyUrl = new URL('/verify', request.url);
    verifyUrl.searchParams.set('email', email);
    
    // If token is provided, include it in the redirect
    if (token) {
      verifyUrl.searchParams.set('token', token);
      console.log('Redirecting to verification page with email and token');
    } else {
      console.log('Redirecting to verification page with email only');
    }
    
    return NextResponse.redirect(verifyUrl);
  } catch (error) {
    console.error('Verification redirect error:', error);
    // If any error occurs, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
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
