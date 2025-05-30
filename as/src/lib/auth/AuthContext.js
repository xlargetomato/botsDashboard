'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Create the authentication context
const AuthContext = createContext();

/**
 * AuthProvider component to manage authentication state across the application
 * Provides login status, user data, and authentication methods
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on initial load and after any changes
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Always check auth status, even on auth pages
      // This ensures we know if a user is already logged in

      try {
        const response = await fetch('/api/auth/session', {
          // Add cache control to prevent caching of the auth status
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('Failed to parse session response:', parseError);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (response.ok) {
          setUser(data.user);
        } else {
          console.error('Session error:', data.error || 'Unknown error');
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  /**
   * Login function that calls the login API and updates the auth state
   * @param {string} email - Email
   * @param {string} password - Password
   * @param {boolean} rememberMe - Whether to remember the user
   * @returns {Promise} - Result of the login attempt
   */
  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        setLoading(false); // Make sure to set loading to false
        return { 
          success: false, 
          error: 'Server error. Please try again later.'
        };
      }

      // Always set loading to false before returning
      setLoading(false);

      if (response.ok && data.success) {
        // Update user state with the returned user data
        setUser(data.user);
        return { success: true };
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Invalid credentials. Please check your email and password.'
          };
        } else if (response.status === 403 && data.needsVerification) {
          return { 
            success: false, 
            error: 'Email not verified',
            needsVerification: true,
            email: data.email
          };
        } else {
          return { 
            success: false, 
            error: data.error || 'An unexpected error occurred',
            needsVerification: data.needsVerification,
            email: data.email
          };
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false); // Make sure to set loading to false
      return { success: false, error: 'An unexpected error occurred. Please check your connection and try again.' };
    }
  };

  /**
   * Logout function that calls the logout API and clears the auth state
   * @returns {Promise} - Result of the logout attempt
   */
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse logout response:', parseError);
      }

      // Clear user state regardless of API response
      setUser(null);
      setLoading(false);
      
      // Force a hard reload to clear all client-side state
      window.location.href = '/';
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setLoading(false);
      window.location.href = '/';
      return { success: false, error: error.message };
    }
  };

  // Value object to be provided to consumers of this context
  const value = {
    user,
    loading,
    login,
    logout,
    // Expose user state directly instead of derived isAuthenticated
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
