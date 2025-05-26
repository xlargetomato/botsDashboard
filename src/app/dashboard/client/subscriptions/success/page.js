'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import Link from 'next/link';

function SubscriptionSuccessContent() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // Ensure correct authentication and data fetching
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedDetails = sessionStorage.getItem('subscriptionDetails');
        if (storedDetails) {
          setSubscription(JSON.parse(storedDetails));
          setAuthenticated(true);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/user/profile');
        if (response.ok) {
          setAuthenticated(true);
          if (subscriptionId) {
            try {
              const subResponse = await fetch(`/api/subscriptions/user?id=${subscriptionId}`);
              if (subResponse.ok) {
                const data = await subResponse.json();
                if (data.subscriptions && data.subscriptions.length > 0) {
                  setSubscription(data.subscriptions[0]);
                }
              }
            } catch (subError) {
              console.error('Error fetching subscription:', subError);
            }
          }
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
  }, [router, subscriptionId]);

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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'تم الاشتراك بنجاح!' : 'Subscription Successful!'}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 font-cairo mb-6 max-w-md mx-auto">
            {isRtl 
              ? 'شكراً لاشتراكك. تم تفعيل حسابك وأصبح بإمكانك الآن الاستفادة من جميع الميزات المتقدمة.' 
              : 'Thank you for your subscription. Your account has been activated and you can now enjoy all the advanced features.'}
          </p>
          
          {subscription && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-8 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'رقم الاشتراك' : 'Subscription ID'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white font-mono">
                    {subscription.subscriptionId ? subscription.subscriptionId.substring(0, 8) : subscription.id?.substring(0, 8)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'الخطة' : 'Plan'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription.planName || subscription.plan_name || 'Premium Plan'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'نوع الاشتراك' : 'Subscription Type'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {subscription.planType || subscription.subscription_type || 'yearly'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'رقم المعاملة' : 'Transaction ID'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white font-mono">
                    {subscription.transactionId || subscription.transaction_id || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'المبلغ المدفوع' : 'Amount Paid'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    EGP {(subscription.amount || subscription.amount_paid || 0).toFixed(2)}
                  </p>
                </div>
                {(subscription.discount > 0 || subscription.discount_amount > 0) && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                      {isRtl ? 'الخصم' : 'Discount'}
                    </p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      EGP {(subscription.discount || subscription.discount_amount || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'تاريخ البدء' : 'Start Date'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(subscription.startDate || subscription.started_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                    {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(subscription.expireDate || subscription.expired_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              href="/dashboard/client/subscriptions" 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
            >
              {isRtl ? 'إدارة الاشتراكات' : 'Manage Subscriptions'}
            </Link>
            <Link 
              href="/dashboard/client" 
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md shadow-sm font-cairo"
            >
              {isRtl ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Wrap the component that uses useSearchParams in a Suspense boundary
export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
