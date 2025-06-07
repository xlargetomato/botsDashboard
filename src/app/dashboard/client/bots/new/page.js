'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { useTranslation } from '@/lib/i18n/config';

export default function NewBotPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions/active', {
        credentials: 'include',
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 401) {
          const url = new URL('/login', window.location.href);
          url.searchParams.set('redirect', '/dashboard/client/bots/new');
          router.push(url.toString());
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch subscriptions');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      setSubscriptions(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubscriptionSelect = (subscriptionId) => {
    router.push(`/dashboard/client/bots/create?subId=${subscriptionId}`);
  };

  const content = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-32">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <button
            onClick={fetchSubscriptions}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isRtl ? 'حاول مرة أخرى' : 'Try Again'}
          </button>
        </div>
      );
    }

    if (subscriptions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white font-cairo">
            {isRtl ? 'لا توجد اشتراكات نشطة متاحة' : 'No Active Subscriptions Available'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center font-cairo">
            {isRtl 
              ? 'تحتاج إلى اشتراك نشط مع فتحات بوت متاحة لإنشاء بوت جديد'
              : 'You need an active subscription with available bot slots to create a new bot.'}
          </p>
          <Link
            href="/dashboard/client/subscriptions"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-cairo"
          >
            {isRtl ? 'عرض خطط الاشتراك' : 'View Subscription Plans'}
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">
            {isRtl ? 'اختر اشتراكًا' : 'Select a Subscription'}
          </h1>
          <Link
            href="/dashboard/client/bots"
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-cairo"
          >
            {isRtl ? 'العودة إلى البوتات ←' : '← Back to Bots'}
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.subscription_id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all"
            >
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white font-cairo">
                {subscription.plan_name}
              </h2>
              <div className="space-y-2 mb-4">
                <p className="text-gray-600 dark:text-gray-300 font-cairo">
                  {isRtl 
                    ? `الوقت المتبقي: ${subscription.days_left} يوم`
                    : `Time Remaining: ${subscription.days_left} days`}
                </p>
                <p className="text-gray-600 dark:text-gray-300 font-cairo">
                  {isRtl
                    ? `الفتحات: ${subscription.slots_used} من ${subscription.slots_total} مستخدمة`
                    : `Slots: ${subscription.slots_used} of ${subscription.slots_total} used`}
                </p>
              </div>
              <button
                onClick={() => handleSubscriptionSelect(subscription.subscription_id)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-cairo"
              >
                {isRtl ? 'استخدم هذا الاشتراك' : 'Use this Subscription'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <div className="w-full">
        {content()}
      </div>
    </MainLayout>
  );
} 