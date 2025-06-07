'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';

export default function PaymentStatus() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get all relevant parameters
        const txnId = searchParams.get('txn_id');
        const orderNumber = searchParams.get('orderNumber');
        const transactionNo = searchParams.get('transactionNo');
        const planId = searchParams.get('planId');
        const planName = searchParams.get('planName');

        if (!txnId && !orderNumber && !transactionNo) {
          throw new Error('No payment identifiers found');
        }

        // Call the transaction status API
        const response = await fetch(`/api/subscriptions/transaction-status?${new URLSearchParams({
          txn_id: txnId || '',
          orderNumber: orderNumber || '',
          transactionNo: transactionNo || ''
        })}`);

        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }

        const data = await response.json();
        
        if (data.status === 'completed' || data.status === 'success' || data.status === 'paid') {
          setStatus('completed');
          setPaymentDetails({
            transactionId: txnId || transactionNo, // Ensure correct ID is used
            orderNumber,
            transactionNo,
            planId,
            planName,
            ...data
          });
        } else if (data.status === 'pending') {
          setStatus('pending');
          // Start polling for status updates
          startPolling(txnId, orderNumber, transactionNo);
        } else {
          setStatus('failed');
          setError(data.message || 'Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('failed');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const createSubscription = async () => {
      try {
        const txnId = searchParams.get('txn_id');
        const transactionNo = searchParams.get('transactionNo');
        const planId = searchParams.get('planId');
        const planName = searchParams.get('planName');

        const createResponse = await fetch('/api/subscriptions/create-from-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionId: txnId || transactionNo,
            planId,
            planName,
            userId: paymentDetails?.userId
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create subscription');
        }
      } catch (error) {
        console.error('Error creating subscription:', error);
        setError(error.message);
        setStatus('failed');
      }
    };

    const startPolling = (txnId, orderNumber, transactionNo) => {
      let attempts = 0;
      const maxAttempts = 10;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const response = await fetch(`/api/subscriptions/transaction-status?${new URLSearchParams({
            txn_id: txnId || '',
            orderNumber: orderNumber || '',
            transactionNo: transactionNo || ''
          })}`);
          
          if (!response.ok) {
            throw new Error('Failed to check payment status');
          }

          const data = await response.json();
          
          if (data.status === 'completed' || data.status === 'success' || data.status === 'paid') {
            setStatus('completed');
            setPaymentDetails(data);
            clearInterval(interval);
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            setStatus('failed');
            setError(data.message || 'Payment failed');
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStatus('failed');
          setError('Payment verification timed out');
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    };

    verifyPayment();
    createSubscription();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
        <p className="text-gray-600">{t('Verifying payment status...')}</p>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('Payment Successful!')}</h2>
            <p className="text-gray-600 mb-6">{t('Your subscription has been activated successfully.')}</p>
            
            {paymentDetails && (
              <div className="text-left border-t border-gray-200 pt-4 mt-4">
                <h3 className="font-semibold mb-2">{t('Transaction Details')}</h3>
                <p className="text-sm text-gray-600">
                  {t('Plan')}: {paymentDetails.planName}<br />
                  {t('Transaction ID')}: {paymentDetails.transactionId || paymentDetails.transactionNo}
                </p>
              </div>
            )}
            
            <Link
              href="/dashboard/client/subscriptions"
              className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('View My Subscriptions')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <FaExclamationTriangle className="text-red-500 text-5xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('Payment Failed')}</h2>
            <p className="text-gray-600 mb-6">{error || t('There was a problem processing your payment.')}</p>
            
            <div className="space-x-4">
              <Link
                href="/dashboard/client/subscriptions"
                className="inline-block px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                {t('Back to Subscriptions')}
              </Link>
              <button
                onClick={() => window.history.back()}
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('Try Again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending status
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('Payment Processing')}</h2>
          <p className="text-gray-600 mb-6">
            {t('Your payment is being processed. This may take a few moments.')}
          </p>
          
          <Link
            href="/dashboard/client/subscriptions"
            className="inline-block px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {t('Back to Subscriptions')}
          </Link>
        </div>
      </div>
    </div>
  );
} 