import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';
import { generateUUID, hashPassword } from '@/lib/auth/authUtils';

// GET - Fetch all users
export async function GET(request) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Get all users (excluding sensitive information)
    const users = await executeQuery(
      'SELECT id, name, email, role, verified, created_at, updated_at FROM users'
    );

    // Convert MySQL boolean to JS boolean for verified field
    const formattedUsers = users.map(user => ({
      ...user,
      verified: user.verified === 1
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create a new user
export async function POST(request) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!authResult.role || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Parse request body
    const { name, email, password, role = 'user', verified = false } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate UUID for new user
    const userId = generateUUID();

    // Insert new user
    await executeQuery(
      'INSERT INTO users (id, name, email, password, role, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, name, email, hashedPassword, role, verified]
    );

    // Get the created user (excluding sensitive information)
    const newUser = await executeQuery(
      'SELECT id, name, email, role, verified, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    // Convert MySQL boolean to JS boolean for verified field
    const formattedUser = {
      ...newUser[0],
      verified: newUser[0].verified === 1
    };

    return NextResponse.json(formattedUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
