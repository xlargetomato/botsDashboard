'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/config';

// Component to display payment method icons
const PaymentMethodIcon = ({ method }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  // Map payment methods to their icon paths
  const methodIcons = {
    'visa': '/images/payment/visa.svg',
    'mastercard': '/images/payment/mastercard.svg',
    'mada': '/images/payment/mada.svg',
    'stcpay': '/images/payment/stcpay.svg',
    'paypal': '/images/payment/paypal.svg',
    'default': '/images/payment/card.svg'
  };
  
  const iconPath = methodIcons[method?.toLowerCase()] || methodIcons.default;
  
  return (
    <div className={`w-6 h-6 flex items-center justify-center ${isRtl ? 'mr-1' : 'ml-1'}`}>
      <Image 
        src={iconPath}
        width={24}
        height={24}
        alt={method || (isRtl ? 'طريقة الدفع' : 'Payment method')}
        className="object-contain"
      />
    </div>
  );
};

// Fetch subscriptions using SWR
const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function SubscriptionList({ subscriptions: initialSubscriptions = [], setActiveTab }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  // Use SWR for auto-refreshing subscriptions data
  const { data, error, mutate } = useSWR('/api/subscriptions/user', fetcher, {
    fallbackData: { subscriptions: initialSubscriptions },
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 60000, // Refresh every minute
  });
  
  const subscriptions = data?.subscriptions || initialSubscriptions;
  
  // Debug subscription data
  console.log('Subscription data:', subscriptions);
  
  // Function to handle showing subscription details
  const handleShowDetails = (subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };
  
  // Function was moved up for better organization
  
  // Function to handle subscription renewal
  const handleRenewSubscription = async (subscription) => {
    try {
      // Create a new subscription with the same plan
      const response = await fetch('/api/subscriptions/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: subscription.plan_id,
          subscriptionType: subscription.subscription_type,
          amountPaid: subscription.amount_paid,
          paymentMethod: subscription.payment_method || 'visa',
        }),
      });

      if (response.ok) {
        // Redirect to checkout page
        const result = await response.json();
        sessionStorage.setItem('pendingSubscriptionId', result.subscriptionId);
        window.location.href = '/dashboard/client/subscriptions/checkout';
      } else {
        console.error('Failed to renew subscription');
      }
    } catch (error) {
      console.error('Error renewing subscription:', error);
    }
  };
  
  // Function to handle subscription activation
  const handleActivateSubscription = async (subscriptionId) => {
    try {
      const response = await fetch('/api/subscriptions/activate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (response.ok) {
        // Refresh the subscriptions data
        mutate();
      } else {
        console.error('Failed to activate subscription');
      }
    } catch (error) {
      console.error('Error activating subscription:', error);
    }
  };
  
  // Function to get status badge class based on status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'canceled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'blocked':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'available':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };
  
  // Function to get status text based on status
  const getStatusText = (status) => {
    if (isRtl) {
      switch (status) {
        case 'active': return 'قيد الاستخدام';
        case 'expired': return 'منتهي';
        case 'canceled': return 'ملغي';
        case 'blocked': return 'محظور';
        case 'available': return 'غير مفعل';
        default: return 'غير مفعل';
      }
    } else {
      switch (status) {
        case 'active': return 'In Use';
        case 'expired': return 'Expired';
        case 'canceled': return 'Canceled';
        case 'blocked': return 'Blocked';
        case 'available': return 'Available';
        default: return 'Available';
      }
    }
  };
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [expandedSubscriptions, setExpandedSubscriptions] = useState({});
  
  // Function to handle toggling expanded subscription view
  const toggleExpanded = (subscriptionId) => {
    setExpandedSubscriptions(prev => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId]
    }));
  };
  
  // Render empty state if no subscriptions
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-white font-cairo mb-2">
              {isRtl ? 'لا توجد اشتراكات' : 'No Subscriptions'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo mb-6 max-w-md">
              {isRtl ? 'لا توجد اشتراكات. اشترك في خطة لبدء الاستفادة من الميزات المتقدمة.' : 'No subscriptions found. Subscribe to a plan to start enjoying advanced features.'}
            </p>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full text-sm font-medium transition-all duration-200 flex items-center font-cairo shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {isRtl ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  استكشاف خطط الاشتراك
                </>
              ) : (
                <>
                  Explore Subscription Plans
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with button to navigate to subscription plans */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-gray-100 dark:border-gray-700">
        <div className={`flex items-center ${isRtl ? ' text-right' : 'flex-row text-left'}`}>
          <div className={`w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center ${isRtl ? 'ml-3' : 'mr-3'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white font-cairo">
            {isRtl ? 'الاشتراكات الحالية' : 'Current Subscriptions'}
            <span className={`${isRtl ? 'mr-2' : 'ml-2'} text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 py-0.5 px-2 rounded-full`}>
              {subscriptions.length}
            </span>
          </h3>
        </div>
        <button
          onClick={() => setActiveTab('plans')}
          className={`w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full text-sm font-medium transition-all duration-200 flex items-center font-cairo justify-center ${isRtl ? 'flex-row-reverse' : 'flex-row'} shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
        >
          {isRtl ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              استكشاف خطط الاشتراك
            </>
          ) : (
            <>
              Explore Subscription Plans
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRtl ? 'mr-2' : 'ml-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {subscriptions.map((subscription) => (
          <div 
            key={subscription.id} 
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg ${
            expandedSubscriptions[subscription.id] ? 'ring-2 ring-blue-500/20' : ''
          }`}
        >
          {/* Card header */}
          <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className={`flex items-center flex-wrap ${isRtl ? 'space-x-reverse' : ''} space-x-2`}>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${
                  subscription.status === 'active' 
                    ? 'bg-green-500' 
                    : subscription.status === 'expired' 
                      ? 'bg-red-500' 
                      : subscription.status === 'available'
                        ? 'bg-purple-500'
                        : 'bg-yellow-500'
                }`}></span>
                <h3 className="font-medium text-gray-900 dark:text-white font-cairo">
                  {subscription.plan_name}
                </h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(subscription.status)}`}>
                {getStatusText(subscription.status)}
              </span>
            </div>
            <button 
              onClick={() => toggleExpanded(subscription.id)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${
                expandedSubscriptions[subscription.id] ? 'transform rotate-180' : ''
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Basic info that's always visible */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-row justify-between items-center">
              <div className={`flex ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'} gap-2 items-baseline`}>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'نوع الاشتراك' : 'Subscription Type:'}                
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize font-cairo">
                  {(subscription.subscription_type || '').toLowerCase().trim() === 'weekly' ? (isRtl ? 'أسبوعي' : 'Weekly') : 
                   (subscription.subscription_type || '').toLowerCase().trim() === 'monthly' ? (isRtl ? 'شهري' : 'Monthly') : 
                   (isRtl ? 'سنوي' : 'Yearly')}
                </p>
              </div>
              
              {/* Time remaining - always visible */}
              <div className="bg-blue-50 dark:bg-blue-900/20 py-1 px-3 rounded-full">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-cairo">
                    {isRtl ? 'المتبقي:' : 'Remaining:'}                  
                  </p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {subscription.remaining_time_detailed ? 
                      `${subscription.remaining_time_detailed.days || 0} ${subscription.remaining_time_detailed.days === 1 ? (isRtl ? 'يوم' : 'day') : (isRtl ? 'أيام' : 'days')}` : 
                      (subscription.remaining_time || (isRtl ? 'غير متوفر' : 'N/A'))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expanded content that toggles with dropdown */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSubscriptions[subscription.id] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                {/* Subscription Info */}
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 font-cairo ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'تفاصيل الاشتراك' : 'Subscription Details'}
                  </h4>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                      </p>
                      <div className={`flex items-center text-sm font-medium text-gray-900 dark:text-white capitalize font-cairo ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <PaymentMethodIcon method={subscription.payment_method} />
                        <span className={isRtl ? 'ml-2' : 'mr-2'}>{subscription.payment_method || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'تاريخ البدء' : 'Start Date'}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                        {new Date(subscription.started_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                        {new Date(subscription.expired_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'رقم الاشتراك' : 'Subscription ID'}
                      </p>
                      <p className="text-xs text-gray-900 dark:text-white font-mono truncate">
                        {subscription.id ? (subscription.id.substring(0, 15) + (subscription.id.length > 15 ? '...' : '')) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Time remaining - detailed view */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex-shrink-0 w-full md:w-auto flex items-center justify-center md:block">
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-cairo mb-2">
                      {isRtl ? 'الوقت المتبقي' : 'Time Remaining'}
                    </p>
                    <div className="text-center">
                      {subscription.remaining_time_detailed ? (
                        <div>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                            {subscription.remaining_time_detailed.days || 0}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 font-cairo">
                            {subscription.remaining_time_detailed.days === 1 
                              ? (isRtl ? 'يوم' : 'Day') 
                              : (isRtl ? 'أيام' : 'Days')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400 font-cairo">
                          {subscription.remaining_time || (isRtl ? 'غير متوفر' : 'Not available')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card footer with actions */}
          <div className={`flex flex-wrap sm:flex-nowrap ${isRtl ? ' justify-start' : ''} gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700`}>
            {/* Only show Use Subscription button for available subscriptions */}
            {subscription.status !== 'active' && (
              <button 
                onClick={() => window.location.href = '/dashboard/client/bots'}
                className={`w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-full shadow-sm font-cairo transition-all transform hover:-translate-y-0.5 flex items-center justify-center ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-2' : 'mr-2'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                {isRtl ? 'استخدام الاشتراك' : 'Use Subscription'}
              </button>
            )}
            <button 
              onClick={() => handleRenewSubscription(subscription)}
              className={`w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full shadow-sm font-cairo transition-all transform hover:-translate-y-0.5 flex items-center justify-center ${isRtl ? 'flex-row-reverse' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-2' : 'mr-2'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {isRtl ? 'تجديد الاشتراك' : 'Renew Subscription'}
            </button>
            <button 
              onClick={() => handleShowDetails(subscription)}
              className={`w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-full shadow-sm font-cairo transition-all transform hover:-translate-y-0.5 flex items-center justify-center ${isRtl ? 'flex-row-reverse' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-2' : 'mr-2'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {isRtl ? 'تفاصيل' : 'Details'}
            </button>
          </div>
        </div>
      ))}
      
      {/* Subscription Details Modal */}
      {showDetailsModal && selectedSubscription && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white font-cairo">
                    {isRtl ? 'تفاصيل الاشتراك' : 'Subscription Details'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded-full p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal content */}
              <div className="p-5" dir={isRtl ? 'rtl' : 'ltr'}>
                {/* Plan information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-5 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                      {isRtl ? 'الخطة' : 'Plan'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSubscription.plan_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                      {isRtl ? 'نوع الاشتراك' : 'Subscription Type'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {(selectedSubscription.subscription_type || '').toLowerCase().trim() === 'weekly' ? (isRtl ? 'أسبوعي' : 'Weekly') : 
                       (selectedSubscription.subscription_type || '').toLowerCase().trim() === 'monthly' ? (isRtl ? 'شهري' : 'Monthly') : 
                       (isRtl ? 'سنوي' : 'Yearly')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                      {isRtl ? 'الحالة' : 'Status'}
                    </p>
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(selectedSubscription.status)}`}>
                      {getStatusText(selectedSubscription.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                      {isRtl ? 'المبلغ المدفوع' : 'Amount'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {parseFloat(selectedSubscription.amount_paid || 0).toFixed(2)} {isRtl ? 'ريال' : 'SAR'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                      {isRtl ? 'تاريخ البدء' : 'Start Date'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedSubscription.started_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                      {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedSubscription.expired_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {/* Payment details */}
                <div className="mb-6 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                      {isRtl ? 'تفاصيل الدفع' : 'Payment Details'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'المبلغ المدفوع' : 'Amount Paid'}
                      </p>
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 dark:text-white font-cairo">
                          {parseFloat(selectedSubscription.amount_paid || 0).toFixed(2)} {isRtl ? 'ريال' : 'SAR'}
                        </span>
                        {selectedSubscription.discount_amount > 0 && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-cairo">
                            ({isRtl ? 'خصم' : 'Discount'}: {parseFloat(selectedSubscription.discount_amount || 0).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                      </p>
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <PaymentMethodIcon method={selectedSubscription.payment_method} />
                        <p className="font-medium text-gray-900 dark:text-white capitalize font-cairo">
                          {selectedSubscription.payment_method || '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'رقم المعاملة' : 'Transaction ID'}
                      </p>
                      <p className="text-xs text-gray-900 dark:text-white truncate font-mono">
                        {selectedSubscription.transaction_id || '-'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'رقم الاشتراك' : 'Subscription ID'}
                      </p>
                      <p className="text-xs text-gray-900 dark:text-white truncate font-mono">
                        {selectedSubscription.id ? (selectedSubscription.id.substring(0, 12) + '...') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-4 flex justify-end">
                <button 
                  type="button" 
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full text-sm font-medium transition-all duration-200 flex items-center font-cairo shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  onClick={() => setShowDetailsModal(false)}
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
