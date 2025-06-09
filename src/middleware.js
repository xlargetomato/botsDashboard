import { NextResponse } from 'next/server';

// Simple JWT verification for Edge Runtime
// Does not use any Node.js modules
// Base64 decoding function compatible with Edge Runtime
function base64Decode(str) {
  // Edge-compatible base64 decoding
  // Convert base64 string to URL-safe variant if needed
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Decode the base64 string
  const decoded = atob(base64);
  // Convert the decoded string to UTF-8
  return decodeURIComponent(
    [...decoded].map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
  );
}

async function verifyJWT(token) {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (middle part) using edge-compatible method
    const payload = JSON.parse(base64Decode(parts[1]));
    
    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/paylink/callback',
  '/api/paylink/3ds-callback',
  '/api/paylink/3ds-return',
  '/dashboard/client/subscriptions/payment-status',
  '/api/subscriptions/transaction-status'
];

// Define routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/user',
  '/api/subscriptions',
  '/api/bots'
];

// Define routes that require admin role
const adminRoutes = [
  '/dashboard/admin',
  '/api/admin',
];

// Define API routes that should return 401 instead of redirecting
const apiRoutes = [
  '/api/user/profile',
  '/api/admin',
  '/api/subscriptions/active',
  '/api/bots/create',
  '/api/bots/botId/qr',
  '/api/bots/botId/connect'
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is for static files or public routes
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.startsWith('/images') || 
    pathname.startsWith('/favicon') ||
    publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return NextResponse.next();
  }
  
  // Check if the path requires authentication or is an admin route
  const isAdminRoute = adminRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  const isProtectedRoute = protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  if (isProtectedRoute || isAdminRoute) {
    // Get the token from the cookies
    const token = request.cookies.get('auth_token')?.value;
    
    // Check if this is an API route that should return 401 instead of redirecting
    const isApiRoute = apiRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
    
    // If there's no token
    if (!token) {
      if (isApiRoute) {
        // Return 401 for API routes
        return NextResponse.json(
          { error: 'Authentication required', authenticated: false },
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            }
          }
        );
      } else {
        // Redirect to login for non-API routes with the original path as redirect parameter
        const url = new URL('/login', request.url);
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
    }
    
    // Edge-compatible JWT verification
    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      // If token is invalid
      if (isApiRoute) {
        // Return 401 for API routes
        return NextResponse.json(
          { error: 'Invalid authentication token', authenticated: false },
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            }
          }
        );
      } else {
        // Clear it and redirect to login for non-API routes
        const url = new URL('/login', request.url);
        url.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(url);
        response.cookies.delete({
          name: 'auth_token',
          path: '/',
        });
        return response;
      }
    }
    
    // Check if the path requires admin role
    if (isAdminRoute) {
      // Check if user has admin role
      if (!decoded.role || decoded.role !== 'admin') {
        if (isApiRoute) {
          // Return 403 for API routes
          return NextResponse.json(
            { error: 'Access denied. Admin privileges required.', authenticated: true, authorized: false },
            { 
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              }
            }
          );
        } else {
          // Redirect to dashboard for non-API routes
          return NextResponse.redirect(new URL('/dashboard/client', request.url));
        }
      }
    }
    
    // Add user ID and role to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role || 'user');
    
    // Token is valid, proceed with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }
  
  // For all other routes, proceed normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
