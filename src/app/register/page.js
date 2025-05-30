'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Register() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language === 'ar';
  
  const [step, setStep] = useState(1); // 1: Registration form, 2: Verification code, 3: Success
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    verificationCode: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  
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
  
  const validateRegistrationForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = isRtl ? 'الاسم مطلوب' : 'Name is required';
    }
    
    // Email validation
    if (!formData.email) {
      newErrors.email = isRtl ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = isRtl ? 'البريد الإلكتروني غير صالح' : 'Invalid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = isRtl ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = isRtl ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = isRtl ? 'كلمات المرور غير متطابقة' : 'Passwords do not match';
    }
    
    // Terms agreement validation
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = isRtl ? 'يجب أن توافق على الشروط والأحكام' : 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateVerificationForm = () => {
    const newErrors = {};
    
    // Verification code validation
    if (!formData.verificationCode.trim()) {
      newErrors.verificationCode = isRtl ? 'رمز التحقق مطلوب' : 'Verification code is required';
    } else if (formData.verificationCode.length !== 6) {
      newErrors.verificationCode = isRtl ? 'يجب أن يتكون رمز التحقق من 6 أرقام' : 'Verification code must be 6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateRegistrationForm()) {
      return;
    }
    
    setIsLoading(true);
    setRegistrationMessage('');
    
    try {
      // Call the registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || (isRtl ? 'فشل التسجيل' : 'Registration failed'));
      }
      
      // Registration successful, move to verification step
      setRegistrationMessage(isRtl 
        ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' 
        : 'Verification email has been sent to your email.'
      );
      setStep(2);
    } catch (error) {
      // Extract the error message and translate it if needed
      const errorMsg = error.message;
      const translatedError = isRtl ? 
        (errorMsg.includes('Registration failed') ? 'فشل التسجيل' : 
         errorMsg.includes('already exists') ? 'البريد الإلكتروني مسجل بالفعل' : 
         errorMsg) : errorMsg;
      
      setRegistrationMessage(isRtl 
        ? `فشل التسجيل: ${translatedError}` 
        : `Registration failed: ${errorMsg}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateVerificationForm()) {
      return;
    }
    
    setIsLoading(true);
    setRegistrationMessage('');
    
    try {
      // Call the verification API endpoint
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          token: formData.verificationCode
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || (isRtl ? 'فشل التحقق' : 'Verification failed'));
      }
      
      // Verification successful
      setRegistrationMessage(isRtl 
        ? 'تم التحقق بنجاح! تم إنشاء حسابك.' 
        : 'Successfully verified! Your account has been created.'
      );
      setStep(3);
    } catch (error) {
      // Extract the error message and translate it if needed
      const errorMsg = error.message;
      const translatedError = isRtl ? 
        (errorMsg.includes('Verification failed') ? 'فشل التحقق' : 
         errorMsg.includes('Invalid token') ? 'رمز التحقق غير صالح' : 
         errorMsg.includes('expired') ? 'انتهت صلاحية رمز التحقق' : 
         errorMsg) : errorMsg;
      
      setRegistrationMessage(isRtl 
        ? `فشل التحقق: ${translatedError}` 
        : `Verification failed: ${errorMsg}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const resendVerificationCode = async () => {
    setIsLoading(true);
    setRegistrationMessage('');
    
    try {
      // Call the resend verification API endpoint
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }
      
      setRegistrationMessage(isRtl 
        ? 'تم إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.' 
        : 'Verification email has been resent to your email.'
      );
    } catch (error) {
      setRegistrationMessage(isRtl 
        ? `فشل إعادة إرسال الرمز: ${error.message}` 
        : `Failed to resend code: ${error.message}`
      );
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
              {/* Registration Form - Step 1 */}
              {step === 1 && (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold font-cairo text-gray-900 dark:text-white">
                      {isRtl ? 'إنشاء حساب' : 'Create Account'}
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300 font-cairo">
                      {isRtl ? 'سجل للوصول إلى لوحة التحكم الخاصة بك' : 'Register to access your dashboard'}
                    </p>
                  </div>
                  
                  {registrationMessage && (
                    <div className={`mb-6 p-3 rounded-md text-center font-cairo ${
                      registrationMessage.includes('failed') 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    }`}>
                      {registrationMessage}
                    </div>
                  )}
                  
                  <form onSubmit={handleRegistrationSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                        {isRtl ? 'الاسم الكامل' : 'Full Name'}
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                          ${errors.name 
                            ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                          dark:bg-gray-700 dark:text-white text-start ${isRtl ? 'text-right' : 'text-left'}`}
                        placeholder={isRtl ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.name}</p>
                      )}
                    </div>
                    
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
                          dark:bg-gray-700 dark:text-white text-start ${isRtl ? 'text-right' : 'text-left'}`}
                        placeholder={isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                        dir={isRtl ? 'rtl' : 'ltr'}

                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                        {isRtl ? 'كلمة المرور' : 'Password'}
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
                        placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter your password'}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.password}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                        {isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
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
                        placeholder={isRtl ? 'أكد كلمة المرور' : 'Confirm your password'}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.confirmPassword}</p>
                      )}
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="agreeTerms"
                          name="agreeTerms"
                          type="checkbox"
                          checked={formData.agreeTerms}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ms-3 text-sm">
                        <label htmlFor="agreeTerms" className="text-gray-700 dark:text-gray-300 font-cairo">
                          {isRtl 
                            ? 'أوافق على الشروط والأحكام وسياسة الخصوصية' 
                            : 'I agree to the Terms and Conditions and Privacy Policy'}
                        </label>
                        {errors.agreeTerms && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.agreeTerms}</p>
                        )}
                      </div>
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
                          ? (isRtl ? 'جاري التسجيل...' : 'Registering...') 
                          : (isRtl ? 'إنشاء حساب' : 'Create Account')}
                      </button>
                    </div>
                  </form>
                  
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                      {isRtl ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                      <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-cairo">
                        {isRtl ? 'تسجيل الدخول' : 'Login'}
                      </Link>
                    </p>
                  </div>
                </>
              )}
              
              {/* Verification Code - Step 2 */}
              {step === 2 && (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold font-cairo text-gray-900 dark:text-white">
                      {isRtl ? 'التحقق من البريد الإلكتروني' : 'Email Verification'}
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300 font-cairo">
                      {isRtl 
                        ? `لقد أرسلنا رمز تحقق إلى ${formData.email}` 
                        : `We've sent a verification code to ${formData.email}`}
                    </p>
                  </div>
                  
                  {registrationMessage && (
                    <div className={`mb-6 p-3 rounded-md text-center font-cairo ${
                      registrationMessage.includes('failed') 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    }`}>
                      {registrationMessage}
                    </div>
                  )}
                  
                  <form onSubmit={handleVerificationSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                        {isRtl ? 'رمز التحقق' : 'Verification Code'}
                      </label>
                      <input
                        id="verificationCode"
                        name="verificationCode"
                        type="text"
                        required
                        value={formData.verificationCode}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo text-center tracking-widest
                          ${errors.verificationCode 
                            ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-900'}
                          dark:bg-gray-700 dark:text-white text-start ${isRtl ? 'text-right' : 'text-left'}`}
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
                </>
              )}
              
              {/* Success - Step 3 */}
              {step === 3 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
                    {isRtl ? 'تم التسجيل بنجاح!' : 'Registration Successful!'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 font-cairo mb-8">
                    {isRtl 
                      ? 'تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول إلى لوحة التحكم الخاصة بك.' 
                      : 'Your account has been successfully created. You can now login to your dashboard.'}
                  </p>
                  <Link 
                    href="/login" 
                    className="inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-cairo"
                  >
                    {isRtl ? 'تسجيل الدخول' : 'Login'}
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
