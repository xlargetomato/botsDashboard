'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAuth } from '@/lib/auth/AuthContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LoginForm() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard/client';
  const isRtl = i18n.language === 'ar';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = redirectPath;
    }
  }, [user, authLoading, redirectPath]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, don't render the login form
  if (user && !isLoading) {
    return null;
  }
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = isRtl ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = isRtl ? 'البريد الإلكتروني غير صالح' : 'Invalid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = isRtl ? 'كلمة المرور مطلوبة' : 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setLoginMessage('');
    
    try {
      const result = await login(formData.email, formData.password, formData.rememberMe);
      
      if (result.success) {
        // Force a page refresh then redirect
        window.location.href = redirectPath;
        return;
      }
      
      if (result.needsVerification) {
        router.push(`/verify?email=${encodeURIComponent(result.email)}`);
        return;
      }
      
      // Display the error message
      setLoginMessage(isRtl ? 'بيانات التسجيل غير صالحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.' : 'Invalid credentials. Please check your email and password.');
    } catch (error) {
      console.error('Login error:', error);
      setLoginMessage(isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`min-h-screen flex flex-col ${isRtl ? 'rtl' : 'ltr'}`}>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-cairo">
                  {isRtl ? 'تسجيل الدخول' : 'Login'}
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-cairo">
                  {isRtl ? 'مرحبًا بعودتك! يرجى تسجيل الدخول للوصول إلى حسابك.' : 'Welcome back! Please sign in to access your account.'}
                </p>
              </div>
              

              
              {/* Login Error Message */}
              {loginMessage && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm font-cairo">
                  {loginMessage}
                </div>
              )}
              
              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                    {isRtl ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                      ${errors.email 
                        ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                      dark:bg-gray-700 dark:text-white`}
                    placeholder={isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    dir="ltr"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                      {isRtl ? 'كلمة المرور' : 'Password'}
                    </label>
                    <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-cairo">
                      {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                      ${errors.password 
                        ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                      dark:bg-gray-700 dark:text-white`}
                    placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter your password'}
                    dir="ltr"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.password}</p>
                  )}
                </div>
                
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="ms-2 block text-sm text-gray-700 dark:text-gray-300 font-cairo">
                    {isRtl ? 'تذكرني' : 'Remember me'}
                  </label>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-cairo
                      ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : null}
                    {isLoading 
                      ? (isRtl ? 'جاري تسجيل الدخول...' : 'Logging in...') 
                      : (isRtl ? 'تسجيل الدخول' : 'Login')}
                  </button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                  {isRtl ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                  <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-cairo">
                    {isRtl ? 'سجل الآن' : 'Register now'}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
    </div>
  );
}
