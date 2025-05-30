'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

export default function ClientDashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Expected JSON response but got:', contentType);
          router.replace('/login?redirect=/dashboard/client');
          return;
        }
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.authenticated) {
            setUser(userData);
          } else {
            // Redirect to login if not authenticated
            router.replace('/login?redirect=/dashboard/client');
          }
        } else {
          // Redirect to login if not authenticated
          router.replace('/login?redirect=/dashboard/client');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.replace('/login?redirect=/dashboard/client');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  

  return (
    
    <MainLayout sidebar={<DashboardSidebar />}>

      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'مرحبًا بك في لوحة التحكم' : 'Welcome to your Dashboard'}
          </h1>
          {user && (
            <p className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl 
                ? `مرحبًا ${user.name}، يمكنك إدارة البوتات والاشتراكات الخاصة بك من هنا.` 
                : `Hello ${user.name}, you can manage your bots and subscriptions from here.`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Bots Card */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/dashboard/client/bots')}
          >
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white ms-4">
                {isRtl ? 'البوتات' : 'Bots'}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'إدارة وإنشاء البوتات الخاصة بك' : 'Manage and create your bots'}
            </p>
          </div>

          {/* Subscriptions Card */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/dashboard/client/subscriptions')}
          >
            <div className="flex items-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white ms-4">
                {isRtl ? 'اشتراكاتي' : 'My Subscriptions'}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'عرض وإدارة اشتراكاتك' : 'View and manage your subscriptions'}
            </p>
          </div>

          {/* Account Card */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/dashboard/client/account')}
          >
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white ms-4">
                {isRtl ? 'حسابي' : 'My Account'}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'إدارة معلومات حسابك' : 'Manage your account information'}
            </p>
          </div>

          {/* Help Card */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/dashboard/client/help')}
          >
            <div className="flex items-center mb-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white ms-4">
                {isRtl ? 'مساعدة' : 'Help'}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'الحصول على المساعدة والدعم' : 'Get help and support'}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
