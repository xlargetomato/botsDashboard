import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { hashPassword, generateUUID, generateVerificationToken, getVerificationTokenExpiry, isValidEmail, isStrongPassword } from '@/lib/auth/authUtils';
import { sendVerificationEmail } from '@/lib/email/emailService';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, email, password } = data;
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
    
    // Check if user already exists
    const existingUsers = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Generate a unique user ID
    const userId = generateUUID();
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Generate 6-digit verification code and expiry
    const verificationCode = generateVerificationToken();
    const tokenExpiry = getVerificationTokenExpiry();
    
    // Store user in database
    await executeQuery(
      `INSERT INTO users (id, name, email, password, verified, verification_token, verification_token_expires) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, hashedPassword, false, verificationCode, tokenExpiry]
    );
    
    // Send verification email with the code
    try {
      await sendVerificationEmail(email, verificationCode, name);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with registration even if email fails
      // In a production environment, you might want to handle this differently
    }
    
    console.log('Registered user:', { userId, name, email });
    
    return NextResponse.json(
      { 
        message: 'User registered successfully. Please check your email to verify your account.',
        userId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
