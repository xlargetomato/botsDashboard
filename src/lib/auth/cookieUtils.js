import { cookies } from 'next/headers';

/**
 * Get auth token from cookies in a Next.js 14 compatible way
 * @returns {Promise<{token: string|null, error: string|null}>}
 */
export async function getAuthToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return { token: null, error: 'Authentication required' };
    }
    
    return { token, error: null };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { token: null, error: 'Failed to authenticate' };
  }
}
