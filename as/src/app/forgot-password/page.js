'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language === 'ar';
  
  const [step, setStep] = useState(1); // 1: Email form, 2: Success message
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email) {
      setError(isRtl ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(isRtl ? 'البريد الإلكتروني غير صالح' : 'Invalid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Call the forgot password API endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }
      
      // Move to success step
      setStep(2);
    } catch (error) {
      setError(isRtl 
        ? `حدث خطأ: ${error.message}` 
        : `Error: ${error.message}`);
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
              {/* Email Form - Step 1 */}
              {step === 1 && (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold font-cairo text-gray-900 dark:text-white">
                      {isRtl ? 'نسيت كلمة المرور' : 'Forgot Password'}
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300 font-cairo">
                      {isRtl 
                        ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.' 
                        : 'Enter your email and we will send you a password reset link.'}
                    </p>
                  </div>
                  
                  {error && (
                    <div className="mb-6 p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-center font-cairo">
                      {error}
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                        {isRtl ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 focus:outline-none dark:bg-gray-700 dark:text-white font-cairo"
                        placeholder={isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
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
                          ? (isRtl ? 'جاري الإرسال...' : 'Sending...') 
                          : (isRtl ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link')}
                      </button>
                    </div>
                  </form>
                  
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                      <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-cairo">
                        {isRtl ? 'العودة إلى تسجيل الدخول' : 'Back to Login'}
                      </Link>
                    </p>
                  </div>
                </>
              )}
              
              {/* Success Message - Step 2 */}
              {step === 2 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
                    {isRtl ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 font-cairo mb-8">
                    {isRtl 
                      ? `لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى ${email}. يرجى التحقق من بريدك الإلكتروني واتباع التعليمات.` 
                      : `We've sent a password reset link to ${email}. Please check your email and follow the instructions.`}
                  </p>
                  <Link 
                    href="/login" 
                    className="inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-cairo"
                  >
                    {isRtl ? 'العودة إلى تسجيل الدخول' : 'Back to Login'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
    </div>
  );
}
