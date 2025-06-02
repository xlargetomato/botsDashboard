'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import SubscriptionList from '@/components/subscriptions/SubscriptionList';
import SubscriptionPlan from '@/components/subscriptions/SubscriptionPlan';

export default function SubscriptionsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true); // Default to true for testing
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'subscriptions'
  const [subscriptionType, setSubscriptionType] = useState('yearly'); // 'yearly' or 'monthly'

  // Fetch subscription plans and user subscriptions
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch subscription plans from the database
        const plansResponse = await fetch('/api/subscriptions/plans');
        
        if (!plansResponse.ok) {
          throw new Error(`Failed to fetch subscription plans: ${plansResponse.status}`);
        }
        
        const plansData = await plansResponse.json();
        
        if (!plansData.plans || plansData.plans.length === 0) {
          setError('No subscription plans available at the moment');
        } else {
          setSubscriptionPlans(plansData.plans);
        }

        // Check if we have cached subscriptions in localStorage first
        const cachedSubscriptions = localStorage.getItem('userSubscriptions');
        if (cachedSubscriptions) {
          try {
            const parsedData = JSON.parse(cachedSubscriptions);
            if (parsedData.subscriptions && Array.isArray(parsedData.subscriptions)) {
              setUserSubscriptions(parsedData.subscriptions);
              // We'll still fetch from the server to ensure data is up-to-date
            }
          } catch (e) {
            console.error('Error parsing cached subscriptions:', e);
            // Continue with server fetch if parsing fails
          }
        }

        // Fetch user subscriptions from the server
        const subscriptionsResponse = await fetch('/api/subscriptions/user');
        
        if (subscriptionsResponse.ok) {
          const subscriptionsData = await subscriptionsResponse.json();
          setUserSubscriptions(subscriptionsData.subscriptions || []);
          
          // Update the cache with the latest data
          localStorage.setItem('userSubscriptions', JSON.stringify(subscriptionsData));
        } else {
          console.error('Failed to fetch user subscriptions:', subscriptionsResponse.status);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();

    // Also check for newly created subscription in session storage
    const checkForNewSubscription = () => {
      const subscriptionDetails = sessionStorage.getItem('subscriptionDetails');
      if (subscriptionDetails) {
        try {
          const parsedData = JSON.parse(subscriptionDetails);
          if (parsedData.status === 'active') {
            // Refresh subscriptions from the server to get the latest data
            fetchSubscriptionData();
          }
        } catch (e) {
          console.error('Error parsing subscription details:', e);
        }
      }
    };

    checkForNewSubscription();
    
    // Set up event listener for storage changes (in case payment completed in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'userSubscriptions' || e.key === 'subscriptionDetails') {
        fetchSubscriptionData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  const handleSubscriptionTypeChange = (type) => {
    setSubscriptionType(type);
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
          <h1 className={`text-2xl font-bold font-cairo ${isRtl ? 'text-right' : ''} text-gray-900 dark:text-white mb-4`}>
            {isRtl ? 'اشتراكاتي' : 'My Subscriptions'}
          </h1>
          <p className={`text-gray-600 dark:text-gray-300 font-cairo ${isRtl ? 'text-right' : ''}`}>
            {isRtl 
              ? 'إدارة اشتراكاتك وخطط الدفع الخاصة بك' 
              : 'Manage your subscriptions and payment plans'}
          </p>
          
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 rtl:space-x-reverse">
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`py-4 px-4 border-b-2 font-medium text-sm w-auto ${isRtl ? 'font-cairo text-right' : ''} ${activeTab === 'subscriptions' 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {isRtl ? 'اشتراكاتي الحالية' : 'My Subscriptions'}
              </button>
              <button
                id="plans-tab"
                onClick={() => setActiveTab('plans')}
                className={`py-4 px-4 border-b-2 font-medium text-sm w-auto ${isRtl ? 'font-cairo text-right' : ''} ${activeTab === 'plans' 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {isRtl ? 'خطط الاشتراك' : 'Subscription Plans'}
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'subscriptions' ? (
          <SubscriptionList subscriptions={userSubscriptions} />
        ) : (
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className={`flex max-md:flex-col max-md:gap-4 ${isRtl ? 'flex-row  ' : ''} justify-between items-center`}>
                <div>
                  <h2 className={`text-2xl font-bold font-cairo ${isRtl ? 'text-right' : ''} text-gray-900 dark:text-white mb-2`}>
                    {isRtl ? 'خطط الاشتراك المتاحة' : 'Available Subscription Plans'}
                  </h2>
                  <p className={`text-gray-600 dark:text-gray-300 font-cairo ${isRtl ? 'text-right' : ''}`}>
                    {isRtl ? 'اختر خطة الاشتراك التي تناسب احتياجاتك' : 'Choose a subscription plan that fits your needs'}
                  </p>
                </div>
                <div className={`inline-flex rounded-md shadow-md ${isRtl ? '' : ''}`}>
                  <button
                    type="button"
                    id="weekly-tab"
                    onClick={() => handleSubscriptionTypeChange('weekly')}
                    className={`px-4 py-2 text-sm font-medium ${isRtl ? 'rounded-r-md font-cairo' : 'rounded-l-md'} ${subscriptionType === 'weekly' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                  >
                    {isRtl ? 'أسبوعي' : 'Weekly'}
                  </button>
                  <button
                    type="button"
                    id="monthly-tab"
                    onClick={() => handleSubscriptionTypeChange('monthly')}
                    className={`px-4 py-2 text-sm font-medium ${isRtl ? 'font-cairo' : ''} ${subscriptionType === 'monthly' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                  >
                    {isRtl ? 'شهري' : 'Monthly'}
                  </button>
                  <button
                    type="button"
                    id="yearly-tab"
                    onClick={() => handleSubscriptionTypeChange('yearly')}
                    className={`px-4 py-2 text-sm font-medium ${isRtl ? 'rounded-l-md font-cairo' : 'rounded-r-md'} ${subscriptionType === 'yearly' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                  >
                    {isRtl ? 'سنوي' : 'Yearly'}
                  </button>
                </div>
              </div>
            </div>
            
            {subscriptionPlans.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                <p className={`text-gray-500 dark:text-gray-400 font-cairo ${isRtl ? 'text-right' : ''}`}>
                  {isRtl ? 'لا توجد خطط اشتراك متاحة حالياً' : 'No subscription plans available at the moment'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {subscriptionPlans.map((plan, index) => (
                  <SubscriptionPlan 
                    key={plan.id} 
                    plan={plan} 
                    selectedType={subscriptionType}
                    isPopular={index === 1} // Mark the second plan (Pro Plan) as the most popular
                    isRtl={isRtl}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}