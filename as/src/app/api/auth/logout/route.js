import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Create a response with success message
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Clear the auth token cookie
    response.cookies.set({
      name: 'auth_token',
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
