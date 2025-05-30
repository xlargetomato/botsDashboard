export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { comparePassword, generateToken } from '@/lib/auth/authUtils';

export async function POST(request) {
  try {
    // Extract redirect URL from request if present
    const url = new URL(request.url);
    const redirectPath = url.searchParams.get('redirect') || '/dashboard/client';
    
    // Get request data
    const data = await request.json();
    const { email, password } = data;
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Find the user in the database
    try {
      // Log the query for debugging
      console.log('Executing database query for email:', email);
      
      // Query the database for the user
      const users = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
      
      // Check if user exists
      if (users.length === 0) {
        console.log('No user found with email:', email);
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      // Get the user data
      const user = users[0];
      console.log('User found with ID:', user.id);
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log('Invalid password for user:', email);
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      // Check if email is verified
      if (user.verified !== 1) {
        console.log('Email not verified for user:', email);
        return NextResponse.json(
          { error: 'Email not verified', needsVerification: true, email: user.email },
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Generate a JWT token with user role
      const token = generateToken(user.id, user.role || 'user');
      
      // Create a JSON response
      const response = NextResponse.json(
        { 
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        },
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Set the cookie with HttpOnly, secure, and SameSite=Lax
      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
      
      return response;
    } catch (dbError) {
      // Log the database error
      console.error('Database error during login:', dbError);
      return NextResponse.json(
        { error: 'Database error: ' + dbError.message },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
