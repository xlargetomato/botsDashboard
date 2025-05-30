import { cookies } from 'next/headers';
import { verifyToken } from './auth/authUtils';
import { executeQuery } from './db/config';

export async function getUserFromToken() {
  const cookieStore = cookies();
  const token = (await cookieStore.get('auth_token'))?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;
  // Fetch user from DB (omit sensitive fields)
  const users = await executeQuery('SELECT id, name, email, role, verified, created_at FROM users WHERE id = ?', [decoded.userId]);
  if (!users.length) return null;
  const user = users[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    verified: user.verified === 1,
    createdAt: user.created_at
  };
}

// Function to verify authentication for API routes
export async function verifyAuth(request) {
  try {
    // Get the cookie from the request headers
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return { success: false, message: 'No authentication token found' };
    }
    
    // Parse the cookie to get the auth_token
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    const token = cookies.auth_token;
    if (!token) {
      return { success: false, message: 'No authentication token found' };
    }
    
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return { success: false, message: 'Invalid authentication token' };
    }
    
    // Check if user exists in database and get role
    const users = await executeQuery('SELECT id, role FROM users WHERE id = ?', [decoded.userId]);
    if (!users.length) {
      return { success: false, message: 'User not found' };
    }
    
    return { 
      success: true, 
      userId: decoded.userId, 
      role: users[0].role || 'user' 
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, message: 'Authentication error' };
  }
}

// Function to verify admin authentication for API routes
export async function verifyAdminAuth() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore.get('auth_token'))?.value;
    
    if (!token) {
      return { success: false, message: 'No authentication token found' };
    }
    
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return { success: false, message: 'Invalid authentication token' };
    }
    
    // Check if user exists in database and has admin role
    const users = await executeQuery('SELECT id, role FROM users WHERE id = ?', [decoded.userId]);
    if (!users.length) {
      return { success: false, message: 'User not found' };
    }
    
    const userRole = users[0].role || 'user';
    if (userRole !== 'admin') {
      return { success: false, message: 'Unauthorized: Admin access required' };
    }
    
    return { 
      success: true, 
      userId: decoded.userId, 
      role: 'admin' 
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return { success: false, message: 'Authentication error' };
  }
}
