'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import Link from 'next/link';

export default function BotsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [bots, setBots] = useState([]);

  // Check authentication status and fetch bots
  useEffect(() => {
    const checkAuthAndFetchBots = async () => {
      try {
        const authResponse = await fetch('/api/user/profile');
        if (!authResponse.ok) {
          router.push('/login');
          return;
        }

          setAuthenticated(true);
        
        // Fetch bots
        const botsResponse = await fetch('/api/bots');
        if (botsResponse.ok) {
          const data = await botsResponse.json();
          setBots(data.bots || []);
        } else {
          console.error('Failed to fetch bots');
        }
      } catch (error) {
        console.error('Authentication check or bots fetch failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchBots();
  }, [router]);

  // Function to get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

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
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white">
            {isRtl ? 'البوتات' : 'Bots'}
          </h1>
            <Link href="/dashboard/client/bots/new">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo">
                {isRtl ? '+ إضافة بوت' : '+ Add Bot'}
              </button>
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-cairo mt-2">
            {isRtl 
              ? 'إدارة وإنشاء البوتات الخاصة بك للواتساب' 
              : 'Manage and create your WhatsApp bots'}
          </p>
        </div>

        {/* Bot list or empty state */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {bots.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRtl ? 'الاسم' : 'Name'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRtl ? 'الحالة' : 'Status'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRtl ? 'الباقة' : 'Tier'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRtl ? 'الأيام المتبقية' : 'Days Left'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRtl ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {bots.map((bot) => (
                    <tr key={bot.bot_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {bot.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(bot.status)}`}>
                          {bot.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {bot.tier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {bot.days_left < 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {isRtl ? 'منتهية' : 'Expired'}
                          </span>
                        ) : (
                          bot.days_left
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/client/bots/${bot.bot_id}`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                          {isRtl ? 'عرض/تعديل' : 'View/Edit'}
                        </Link>
                        {bot.status === 'expired' && (
                          <Link href="/dashboard/client/subscriptions" className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                            {isRtl ? 'تجديد' : 'Renew'}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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
              <Link href="/dashboard/client/bots/new">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo">
              {isRtl ? 'إنشاء بوت جديد' : 'Create New Bot'}
            </button>
              </Link>
          </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
