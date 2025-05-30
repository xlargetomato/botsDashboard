import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/config';
import { verifyAuth } from '@/lib/auth';
import { hashPassword } from '@/lib/auth/authUtils';

// GET - Fetch a single user by ID
export async function GET(request, { params }) {
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
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Get user by ID (excluding sensitive information)
    const users = await executeQuery(
      'SELECT id, name, email, role, verified, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Convert MySQL boolean to JS boolean for verified field
    const formattedUser = {
      ...users[0],
      verified: users[0].verified === 1
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT - Update a user by ID
export async function PUT(request, { params }) {
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
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { id } = params;
    const { name, email, role, verified, password } = await request.json();

    // Check if user exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already used by another user
    if (email) {
      const emailUsers = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (emailUsers.length > 0) {
        return NextResponse.json(
          { error: 'Email already in use by another user' },
          { status: 409 }
        );
      }
    }

    // Prepare update query and parameters
    let updateQuery = 'UPDATE users SET updated_at = NOW()';
    const updateParams = [];

    // Add fields to update if provided
    if (name) {
      updateQuery += ', name = ?';
      updateParams.push(name);
    }

    if (email) {
      updateQuery += ', email = ?';
      updateParams.push(email);
    }

    if (role) {
      updateQuery += ', role = ?';
      updateParams.push(role);
    }

    if (verified !== undefined) {
      updateQuery += ', verified = ?';
      updateParams.push(verified);
    }

    if (password) {
      // Hash new password
      const hashedPassword = await hashPassword(password);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    // Add WHERE clause and execute update
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await executeQuery(updateQuery, updateParams);

    // Get updated user (excluding sensitive information)
    const updatedUsers = await executeQuery(
      'SELECT id, name, email, role, verified, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    // Convert MySQL boolean to JS boolean for verified field
    const formattedUser = {
      ...updatedUsers[0],
      verified: updatedUsers[0].verified === 1
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user by ID
export async function DELETE(request, { params }) {
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
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if user exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
