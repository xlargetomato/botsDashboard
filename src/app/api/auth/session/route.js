export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/authUtils';

export async function GET() {
  try {
    // Get the auth token from cookies
    const cookieStore = cookies();
    const authCookie = cookieStore.get('auth_token');
    const token = authCookie?.value;

    if (!token) {
      return NextResponse.json(
        { user: null },
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { user: null },
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return NextResponse.json(
      { user },
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { user: null, error: 'Session error' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
