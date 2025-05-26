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
  
  // Function to handle toggling expanded subscription view
  const toggleExpanded = (subscriptionId) => {
    setExpandedSubscriptions(prev => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId]
    }));
  };
  
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
  
  // Render empty state if no subscriptions
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-800 dark:text-white font-cairo">
              {isRtl ? 'الاشتراكات' : 'Subscriptions'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('plans')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center font-cairo"
          >
            {isRtl ? 'استكشاف خطط الاشتراك' : 'Get a Subscription'}
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRtl ? 'mr-2' : 'ml-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        <p className={`text-sm text-gray-500 dark:text-gray-400 font-cairo ${isRtl ? 'text-right' : ''}`}>
          {isRtl ? 'لا توجد اشتراكات. اشترك في خطة لبدء الاستفادة من الميزات المتقدمة.' : 'No subscriptions found. Subscribe to a plan to start enjoying advanced features.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with button to navigate to subscription plans */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white font-cairo">
          {isRtl ? 'الاشتراكات الحالية' : 'Current Subscriptions'}
        </h3>
        <button
          onClick={() => setActiveTab('plans')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center font-cairo"
        >
          {isRtl ? 'استكشاف خطط الاشتراك' : 'Explore Subscription Plans'}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRtl ? 'mr-2' : 'ml-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
      
      {subscriptions.map((subscription) => (
        <div 
          key={subscription.id} 
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
            expandedSubscriptions[subscription.id] ? 'shadow-lg' : ''
          }`}
        >
          {/* Card header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center space-x-2">
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(subscription.status)}`}>
                {getStatusText(subscription.status)}
              </span>
            </div>
            <button 
              onClick={() => toggleExpanded(subscription.id)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${
                expandedSubscriptions[subscription.id] ? 'transform rotate-180' : ''
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Card content */}
          <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Subscription Info */}
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                      {isRtl ? 'نوع الاشتراك' : 'Subscription Type'}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {(subscription.subscription_type || '').toLowerCase().trim() === 'weekly' ? (isRtl ? 'أسبوعي' : 'Weekly') : 
                       (subscription.subscription_type || '').toLowerCase().trim() === 'monthly' ? (isRtl ? 'شهري' : 'Monthly') : 
                       (isRtl ? 'سنوي' : 'Yearly')}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                      {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                    </p>
                    <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white capitalize">
                      <PaymentMethodIcon method={subscription.payment_method} />
                      {subscription.payment_method || '-'}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                      {isRtl ? 'تاريخ البدء' : 'Start Date'}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(subscription.started_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                      {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(subscription.expired_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Time remaining */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg flex-shrink-0 w-full md:w-auto">
                <div className="flex flex-col items-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                    {isRtl ? 'الوقت المتبقي' : 'Time Remaining'}
                  </p>
                  <div className="text-center">
                    {subscription.remaining_time_detailed ? (
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {/* Display the actual remaining days calculated from the subscription */}
                          {subscription.remaining_time_detailed.days || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {subscription.remaining_time_detailed.days === 1 
                            ? (isRtl ? 'يوم' : 'Day') 
                            : (isRtl ? 'أيام' : 'Days')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {subscription.remaining_time || (isRtl ? 'غير متوفر' : 'Not available')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card footer with actions */}
          <div className={`flex justify-end ${isRtl ? "flex-row-reverse" : ''} gap-2 p-3 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700`}>
            {/* Only show Use Subscription button for available subscriptions */}
            {subscription.status !== 'active' && (
              <button 
                onClick={() => window.location.href = '/dashboard/client/bots'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm font-cairo transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                {isRtl ? 'استخدام الاشتراك' : 'Use Subscription'}
              </button>
            )}
            <button 
              onClick={() => handleRenewSubscription(subscription)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {isRtl ? 'تجديد الاشتراك' : 'Renew Subscription'}
            </button>
            <button 
              onClick={() => handleShowDetails(subscription)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-md shadow-sm font-cairo transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {isRtl ? 'تفاصيل' : 'Details'}
            </button>
          </div>
        </div>
      ))}
      
      {/* Subscription Details Modal */}
      {showDetailsModal && selectedSubscription && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-cairo">
                  {isRtl ? 'تفاصيل الاشتراك' : 'Subscription Details'}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal content */}
              <div className="p-5" dir={isRtl ? 'rtl' : 'ltr'}>
                {/* Plan information */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
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
                <div className="mb-4 pb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-3">
                    {isRtl ? 'تفاصيل الدفع' : 'Payment Details'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'المبلغ المدفوع' : 'Amount Paid'}
                      </p>
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {parseFloat(selectedSubscription.amount_paid || 0).toFixed(2)} {isRtl ? 'ريال' : 'SAR'}
                        </span>
                        {selectedSubscription.discount_amount > 0 && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            ({isRtl ? 'خصم' : 'Discount'}: {parseFloat(selectedSubscription.discount_amount || 0).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                      </p>
                      <div className="flex items-center gap-1">
                        <PaymentMethodIcon method={selectedSubscription.payment_method} />
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {selectedSubscription.payment_method || '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'رقم المعاملة' : 'Transaction ID'}
                      </p>
                      <p className="font-mono text-xs text-gray-900 dark:text-white truncate">
                        {selectedSubscription.transaction_id || '-'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo mb-1">
                        {isRtl ? 'رقم الاشتراك' : 'Subscription ID'}
                      </p>
                      <p className="font-mono text-xs text-gray-900 dark:text-white truncate">
                        {selectedSubscription.id ? (selectedSubscription.id.substring(0, 12) + '...') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm font-cairo"
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
  );
}
