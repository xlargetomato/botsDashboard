'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ResetPasswordForm() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Redirect if no token provided
  useEffect(() => {
    if (!token) {
      router.push('/forgot-password');
    }
  }, [token, router]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    
    // Password validation
    if (!formData.password) {
      newErrors.password = isRtl ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = isRtl ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = isRtl ? 'تأكيد كلمة المرور مطلوب' : 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = isRtl ? 'كلمات المرور غير متطابقة' : 'Passwords do not match';
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
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
        setMessage(isRtl ? 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.' : 'Password has been reset successfully. You can now login with your new password.');
        
        // Clear form
        setFormData({
          password: '',
          confirmPassword: ''
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setIsSuccess(false);
        setMessage(data.error || (isRtl ? 'فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.' : 'Failed to reset password. Please try again.'));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setIsSuccess(false);
      setMessage(isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!token) {
    return null; // Will redirect in useEffect
  }
  
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
                  {isRtl ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-cairo">
                  {isRtl ? 'أدخل كلمة المرور الجديدة الخاصة بك' : 'Enter your new password'}
                </p>
              </div>
              
              {/* Theme and Language Switchers */}
              <div className="flex justify-between mb-6">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
              
              {/* Status Message */}
              {message && (
                <div className={`mb-6 p-4 rounded-md ${isSuccess ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                  <p className="text-sm font-cairo">{message}</p>
                </div>
              )}
              
              {/* Reset Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                    {isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                      ${errors.password 
                        ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                      dark:bg-gray-700 dark:text-white text-start ${isRtl ? 'text-right' : 'text-left'}`}
                    placeholder={isRtl ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                    dir="auto"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.password}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                    {isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                      ${errors.confirmPassword 
                        ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                      dark:bg-gray-700 dark:text-white text-start ${isRtl ? 'text-right' : 'text-left'}`}
                    placeholder={isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
                    dir="auto"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-cairo
                      ${(isLoading || isSuccess) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : null}
                    {isLoading 
                      ? (isRtl ? 'جاري المعالجة...' : 'Processing...') 
                      : (isRtl ? 'إعادة تعيين كلمة المرور' : 'Reset Password')}
                  </button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                  <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-cairo">
                    {isRtl ? '← العودة إلى تسجيل الدخول' : '← Back to Login'}
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
