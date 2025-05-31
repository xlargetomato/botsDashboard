'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';
import Link from 'next/link';

function PaymentStatusContent() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get invoice and transaction IDs from query parameters
  const invoiceId = searchParams.get('invoiceId');
  const transactionId = searchParams.get('transactionId') || searchParams.get('txnId');
  
  // Get error messages if present (for direct errors from payment gateway)
  const errorMessage = searchParams.get('message');
  const errorStatus = searchParams.get('status');
  const errorCode = searchParams.get('code'); // Get error code from Paylink
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);
  
  // Set error state immediately if error message is in URL
  useEffect(() => {
    if (errorStatus === 'error' && errorMessage) {
      setError(errorMessage);
      setLoading(false);
    } else if (!invoiceId && !transactionId && !errorStatus) {
      // Only redirect if we have no parameters at all
      router.push('/dashboard/client/subscriptions');
    }
  }, [invoiceId, transactionId, errorStatus, errorMessage, router]);
  
  // Poll for payment status - but only if we don't already have an error from URL params
  useEffect(() => {
    // Skip polling if we already have an error from URL parameters
    if (errorStatus === 'error' && errorMessage) {
      return;
    }
    
    let pollingInterval;
    let pollingCount = 0;
    const MAX_POLLING = 10; // Poll up to 10 times
    
    const checkPaymentStatus = async () => {
      try {
        if (!invoiceId && !transactionId) {
          return;
        }
        
        const queryParam = invoiceId 
          ? `invoiceId=${invoiceId}` 
          : `transactionId=${transactionId}`;
        
        const response = await fetch(`/api/paylink/getInvoice?${queryParam}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to verify payment');
        }
        
        const data = await response.json();
        setPaymentDetails(data);
        
        // Determine status
        if (data.transaction?.status === 'completed') {
          setPaymentStatus('completed');
          clearInterval(pollingInterval);
        } else if (data.transaction?.status === 'failed') {
          setPaymentStatus('failed');
          clearInterval(pollingInterval);
        } else {
          setPaymentStatus('pending');
          
          // Stop polling after MAX_POLLING attempts
          pollingCount++;
          if (pollingCount >= MAX_POLLING) {
            clearInterval(pollingInterval);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking payment status:', err);
        setError(err.message);
        setLoading(false);
        clearInterval(pollingInterval);
      }
    };
    
    // Check immediately and then set up polling
    checkPaymentStatus();
    pollingInterval = setInterval(checkPaymentStatus, 5000); // Poll every 5 seconds
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [invoiceId, transactionId, errorMessage, errorStatus]);
  
  // Status-specific content
  const renderStatusContent = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-700 dark:text-gray-300 font-cairo">
            {isRtl ? 'جاري التحقق من حالة الدفع...' : 'Verifying payment status...'}
          </p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-8">
          <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-white font-cairo">
            {isRtl ? 'حدث خطأ' : 'Error Occurred'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {error}
          </p>
          {errorCode && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">
              {isRtl ? 'كود الخطأ: ' : 'Error code: '} {errorCode}
            </p>
          )}
          {transactionId && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              {isRtl ? 'رقم المعاملة: ' : 'Transaction ID: '} {transactionId}
            </p>
          )}
          <div className="mt-6">
            <Link 
              href="/dashboard/client/subscriptions"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm font-cairo"
            >
              {isRtl ? 'العودة إلى الاشتراكات' : 'Return to Subscriptions'}
            </Link>
          </div>
        </div>
      );
    }
    
    if (paymentStatus === 'completed') {
      return (
        <div className="text-center py-8">
          <div className="rounded-full h-16 w-16 bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-white font-cairo">
            {isRtl ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isRtl 
              ? 'تمت معالجة دفعتك بنجاح. يمكنك الآن الوصول إلى اشتراكك.'
              : 'Your payment has been processed successfully. You can now access your subscription.'}
          </p>
          
          {paymentDetails?.subscription && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 max-w-md mx-auto">
              <h3 className="font-bold text-gray-800 dark:text-white font-cairo">
                {isRtl ? 'تفاصيل الاشتراك' : 'Subscription Details'}
              </h3>
              <div className="mt-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isRtl ? 'الخطة' : 'Plan'}:
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {paymentDetails.subscription.planName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isRtl ? 'النوع' : 'Type'}:
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {paymentDetails.subscription.subscriptionType}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isRtl ? 'تاريخ الانتهاء' : 'Expires'}:
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {new Date(paymentDetails.subscription.expiredDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isRtl ? 'الحالة' : 'Status'}:
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {isRtl ? 'مدفوع' : 'Paid'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <Link 
              href="/dashboard/client/subscriptions"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm font-cairo"
            >
              {isRtl ? 'العودة إلى الاشتراكات' : 'View My Subscriptions'}
            </Link>
          </div>
        </div>
      );
    }
    
    if (paymentStatus === 'failed') {
      return (
        <div className="text-center py-8">
          <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-white font-cairo">
            {isRtl ? 'فشل الدفع' : 'Payment Failed'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isRtl 
              ? 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى باستخدام طريقة دفع مختلفة.'
              : 'We were unable to process your payment. Please try again with a different payment method.'}
          </p>
          <div className="mt-6">
            <Link 
              href="/dashboard/client/subscriptions"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm font-cairo mx-2"
            >
              {isRtl ? 'العودة إلى الاشتراكات' : 'Return to Subscriptions'}
            </Link>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow-sm font-cairo mx-2 mt-2 sm:mt-0"
            >
              {isRtl ? 'العودة للمحاولة مرة أخرى' : 'Try Again'}
            </button>
          </div>
        </div>
      );
    }
    
    // Default: pending status
    return (
      <div className="text-center py-8">
        <div className="rounded-full h-16 w-16 bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
          <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-white font-cairo">
          {isRtl ? 'الدفع قيد المعالجة' : 'Payment Processing'}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {isRtl 
            ? 'دفعتك قيد المعالجة. قد يستغرق هذا بضع دقائق. سنقوم بتحديث هذه الصفحة تلقائياً.'
            : 'Your payment is being processed. This may take a few minutes. We will update this page automatically.'}
        </p>
        <div className="mt-6">
          <Link 
            href="/dashboard/client/subscriptions"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow-sm font-cairo"
          >
            {isRtl ? 'العودة إلى الاشتراكات' : 'Return to Subscriptions'}
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-cairo">
          {isRtl ? 'حالة الدفع' : 'Payment Status'}
        </h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {renderStatusContent()}
      </div>
      
      {paymentDetails && paymentStatus === 'pending' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isRtl 
              ? 'رقم المعاملة:' 
              : 'Transaction ID:'} {paymentDetails.transaction?.transactionId || transactionId}
          </p>
        </div>
      )}
    </div>
  );
}

// Wrap the component that uses useSearchParams in a Suspense boundary
export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>}>
      <PaymentStatusContent />
    </Suspense>
  );
}
