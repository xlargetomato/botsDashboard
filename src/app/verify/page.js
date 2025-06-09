'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function VerifyEmail() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRtl = i18n.language === 'ar';
  
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'success', 'error', 'info'
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    // Get email from query parameters
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in query params, redirect to login
      router.push('/login');
    }
    
    // If token is provided, auto-fill it
    if (tokenParam) {
      setVerificationCode(tokenParam);
      console.log('Auto-filled verification code from URL');
    }
  }, [searchParams, router]);
  
  const validateForm = () => {
    const newErrors = {};
    
    // Verification code validation
    if (!verificationCode.trim()) {
      newErrors.verificationCode = isRtl ? 'رمز التحقق مطلوب' : 'Verification code is required';
    } else if (verificationCode.length !== 6) {
      newErrors.verificationCode = isRtl ? 'يجب أن يتكون رمز التحقق من 6 أرقام' : 'Verification code must be 6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      // Call the verification API endpoint
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          token: verificationCode
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || (isRtl ? 'فشل التحقق' : 'Verification failed'));
      }
      
      // Verification successful
      setMessageType('success');
      setMessage(isRtl 
        ? 'تم التحقق بنجاح! يمكنك الآن تسجيل الدخول.' 
        : 'Successfully verified! You can now log in.'
      );
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      // Extract the error message and translate it if needed
      const errorMsg = error.message;
      const translatedError = isRtl ? 
        (errorMsg.includes('Verification failed') ? 'فشل التحقق' : 
         errorMsg.includes('Invalid token') ? 'رمز التحقق غير صالح' : 
         errorMsg.includes('expired') ? 'انتهت صلاحية رمز التحقق' : 
         errorMsg) : errorMsg;
      
      setMessageType('error');
      setMessage(isRtl 
        ? `فشل التحقق: ${translatedError}` 
        : `Verification failed: ${errorMsg}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const resendVerificationCode = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // Call the resend verification API endpoint
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }
      
      setMessageType('info');
      setMessage(isRtl 
        ? 'تم إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.' 
        : 'Verification email has been resent to your email.'
      );
    } catch (error) {
      setMessageType('error');
      setMessage(isRtl 
        ? `فشل إعادة إرسال الرمز: ${error.message}` 
        : `Failed to resend code: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`min-h-screen flex flex-col ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Theme & Language Switchers in top-right corner */}
      <div className="absolute top-4 right-4 flex items-center space-x-4">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      
      {/* Main content */}
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-cairo text-gray-900 dark:text-white">
                  {isRtl ? 'التحقق من البريد الإلكتروني' : 'Email Verification'}
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300 font-cairo">
                  {isRtl 
                    ? `لقد أرسلنا رمز تحقق إلى ${email}` 
                    : `We've sent a verification code to ${email}`}
                </p>
              </div>
              
              {message && (
                <div className={`mb-6 p-3 rounded-md text-center font-cairo ${
                  messageType === 'error' 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' 
                    : messageType === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                }`}>
                  {message}
                </div>
              )}
              
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                    {isRtl ? 'رمز التحقق' : 'Verification Code'}
                  </label>
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      if (errors.verificationCode) {
                        setErrors(prev => ({ ...prev, verificationCode: '' }));
                      }
                    }}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo text-center tracking-widest
                      ${errors.verificationCode 
                        ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                      dark:bg-gray-700 dark:text-white`}
                    placeholder={isRtl ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit verification code'}
                    maxLength={6}
                    dir={isRtl ? 'rtl' : 'ltr'}
                  />
                  {errors.verificationCode && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.verificationCode}</p>
                  )}
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
                      ? (isRtl ? 'جاري التحقق...' : 'Verifying...') 
                      : (isRtl ? 'تحقق' : 'Verify')}
                  </button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                  {isRtl ? 'لم تستلم الرمز؟' : "Didn't receive the code?"}{' '}
                  <button 
                    onClick={resendVerificationCode}
                    disabled={isLoading}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-cairo"
                  >
                    {isRtl ? 'إعادة إرسال' : 'Resend'}
                  </button>
                </p>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                  {isRtl ? 'العودة إلى' : 'Back to'}{' '}
                  <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-cairo">
                    {isRtl ? 'تسجيل الدخول' : 'Login'}
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