import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '@/lib/db/config';

// Secret key for JWT tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file';

// Function to hash a password
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Function to compare a password with a hash
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Function to generate a JWT token
export function generateToken(userId, role = 'user') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

// Function to verify a JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Function to verify a JWT token and check if user is an admin
export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId || decoded.role !== 'admin') {
      return null;
    }
    return { ...decoded, isAdmin: true };
  } catch (error) {
    return null;
  }
}

// Function to generate a 6-digit verification code
export function generateVerificationToken() {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to generate a random reset token
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Function to generate a UUID
export function generateUUID() {
  return uuidv4();
}

// Function to get a user from a token
export async function getUserFromToken(token) {
  try {
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return null;
    }
    
    // Get the user from the database
    const users = await executeQuery(
      'SELECT id, name, email, role, verified, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    const user = users[0];
    
    // Return user data (excluding sensitive information)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      verified: user.verified === 1, // Convert from MySQL boolean to JS boolean
      createdAt: user.created_at
    };
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// Function to get token expiration date (24 hours from now for verification)
export function getVerificationTokenExpiry() {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  return date;
}

// Function to get token expiration date (1 hour from now for password reset)
export function getResetTokenExpiry() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date;
}

// Function to validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to validate password strength
export function isStrongPassword(password) {
  // Password must be at least 8 characters long and contain at least one uppercase letter,
  // one lowercase letter, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}
