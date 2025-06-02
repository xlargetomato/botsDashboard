'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

export default function AccountPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  // Check authentication status and load user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setFormData(prev => ({
            ...prev,
            name: userData.name,
            email: userData.email
          }));
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrors({});

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(isRtl ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
        if (data.user) {
          setUser(data.user);
          setFormData(prev => ({
            ...prev,
            name: data.user.name,
            email: data.user.email
          }));
        }
      } else {
        setErrors({
          submit: data.error || (isRtl ? 'حدث خطأ أثناء تحديث الملف الشخصي' : 'Error updating profile')
        });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setErrors({
        submit: isRtl ? 'حدث خطأ في الخادم' : 'Server error occurred'
      });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrors({});
    
    // Validate passwords
    const newErrors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = isRtl ? 'كلمة المرور الحالية مطلوبة' : 'Current password is required';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = isRtl ? 'كلمة المرور الجديدة مطلوبة' : 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = isRtl ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = isRtl ? 'كلمات المرور غير متطابقة' : 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(isRtl ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
        if (data.user) {
          setUser(data.user);
        }
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setErrors({
          submit: data.error || (isRtl ? 'حدث خطأ أثناء تحديث كلمة المرور' : 'Error updating password')
        });
      }
    } catch (error) {
      console.error('Password update error:', error);
      setErrors({
        submit: isRtl ? 'حدث خطأ في الخادم' : 'Server error occurred'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'حسابي' : 'My Account'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl 
              ? 'إدارة معلومات حسابك وتفضيلاتك' 
              : 'Manage your account information and preferences'}
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-cairo">
            {message}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'المعلومات الشخصية' : 'Profile Information'}
          </h2>
          
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'الاسم' : 'Name'}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                dir={isRtl ? 'rtl' : 'ltr'}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                dir="ltr"
                disabled
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl ? 'لا يمكن تغيير البريد الإلكتروني' : 'Email cannot be changed'}
              </p>
            </div>
            
            <div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
              >
                {isRtl ? 'تحديث الملف الشخصي' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'تغيير كلمة المرور' : 'Change Password'}
          </h2>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'كلمة المرور الحالية' : 'Current Password'}
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                  ${errors.currentPassword 
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'}
                  dark:bg-gray-700 dark:text-white`}
                dir="ltr"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.currentPassword}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                  ${errors.newPassword 
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'}
                  dark:bg-gray-700 dark:text-white`}
                dir="ltr"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.newPassword}</p>
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
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none font-cairo
                  ${errors.confirmPassword 
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'}
                  dark:bg-gray-700 dark:text-white`}
                dir="ltr"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-cairo">{errors.confirmPassword}</p>
              )}
            </div>
            
            <div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
              >
                {isRtl ? 'تحديث كلمة المرور' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
