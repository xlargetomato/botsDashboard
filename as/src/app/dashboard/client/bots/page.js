'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

export default function BotsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          setAuthenticated(true);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'البوتات' : 'Bots'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl 
              ? 'إدارة وإنشاء البوتات الخاصة بك للواتساب' 
              : 'Manage and create your WhatsApp bots'}
          </p>
        </div>

        {/* Bot list or empty state */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-bold font-cairo text-gray-700 dark:text-gray-300 mb-2">
              {isRtl ? 'لا توجد بوتات بعد' : 'No bots yet'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-cairo mb-6 max-w-md mx-auto">
              {isRtl 
                ? 'ابدأ بإنشاء بوت جديد للواتساب لمساعدتك في أتمتة المحادثات والمهام' 
                : 'Start by creating a new WhatsApp bot to help you automate conversations and tasks'}
            </p>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo">
              {isRtl ? 'إنشاء بوت جديد' : 'Create New Bot'}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
