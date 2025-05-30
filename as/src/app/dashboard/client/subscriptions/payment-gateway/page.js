'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';

export default function PaymentGatewayPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Payment states
  const [loading, setLoading] = useState(true);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Transaction details from URL params
  const transactionId = searchParams.get('txn_id');
  const amount = searchParams.get('amount');
  const planName = searchParams.get('plan_name');
  
  useEffect(() => {
    // Validate transaction parameters
    if (!transactionId || !amount || !planName) {
      router.push('/dashboard/client/subscriptions');
      return;
    }
    
    // Simulate loading the gateway
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [transactionId, amount, planName, router]);
  
  const formatCardNumber = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format with spaces every 4 digits
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.slice(0, 19);
  };
  
  const formatExpiryDate = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as MM/YY
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };
  
  const handleCardNumberChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
  };
  
  const handleExpiryDateChange = (e) => {
    setExpiryDate(formatExpiryDate(e.target.value));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate card number (should be 16 digits)
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = isRtl ? 'يجب أن يكون رقم البطاقة 16 رقمًا' : 'Card number must be 16 digits';
    }
    
    // Validate expiry date (format MM/YY)
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = isRtl ? 'صيغة تاريخ انتهاء الصلاحية غير صحيحة' : 'Invalid expiry date format';
    } else {
      const [month, year] = expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiryDate = isRtl ? 'الشهر يجب أن يكون بين 1 و 12' : 'Month must be between 1 and 12';
      } else if (parseInt(year) < currentYear || 
                (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = isRtl ? 'البطاقة منتهية الصلاحية' : 'Card is expired';
      }
    }
    
    // Validate CVV (should be 3 digits)
    if (!/^\d{3}$/.test(cvv)) {
      newErrors.cvv = isRtl ? 'يجب أن يكون رمز CVV 3 أرقام' : 'CVV must be 3 digits';
    }
    
    // Validate cardholder name
    if (!cardholderName.trim()) {
      newErrors.cardholderName = isRtl ? 'اسم حامل البطاقة مطلوب' : 'Cardholder name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Simulate processing payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the subscription details from session storage
      const subscriptionDetails = sessionStorage.getItem('subscriptionDetails');
      let subscriptionData = null;
      
      if (subscriptionDetails) {
        subscriptionData = JSON.parse(subscriptionDetails);
      }
      
      // Call our API to register the payment
      const response = await fetch('/api/subscriptions/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          status: 'completed',
          paymentMethod: subscriptionData?.payment_method || 'visa',
          lastFourDigits: cardNumber.replace(/\s/g, '').slice(-4)
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the subscription in session storage with active status
        if (subscriptionData) {
          subscriptionData.status = 'active';
          sessionStorage.setItem('subscriptionDetails', JSON.stringify(subscriptionData));
          
          // Refresh the user's subscriptions in local storage for immediate display
          try {
            const userSubscriptionsResponse = await fetch('/api/subscriptions/user');
            if (userSubscriptionsResponse.ok) {
              const subscriptionsData = await userSubscriptionsResponse.json();
              localStorage.setItem('userSubscriptions', JSON.stringify(subscriptionsData));
            }
          } catch (refreshError) {
            console.error('Error refreshing subscriptions:', refreshError);
          }
        }
        
        // Redirect to success page
        router.push(`/dashboard/client/subscriptions/success?id=${data.subscriptionId}`);
      } else {
        // Show error
        setErrors({ form: data.message || (isRtl ? 'فشلت عملية الدفع' : 'Payment failed') });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setErrors({ form: isRtl ? 'حدث خطأ أثناء معالجة الدفع' : 'Error processing payment' });
      setIsProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">
          {isRtl ? 'جاري تحويلك إلى بوابة الدفع...' : 'Redirecting to payment gateway...'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Payment Gateway Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-auto relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white">
            {isRtl ? 'بوابة الدفع الآمنة' : 'Secure Payment Gateway'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'أدخل تفاصيل بطاقتك لإتمام الدفع' : 'Enter your card details to complete payment'}
          </p>
        </div>
        
        {/* Transaction Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'رقم المعاملة' : 'Transaction ID'}
            </span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">
              {transactionId}
            </span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'خطة الاشتراك' : 'Subscription Plan'}
            </span>
            <span className="text-gray-900 dark:text-white font-medium">
              {decodeURIComponent(planName)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300 font-cairo">
              {isRtl ? 'المبلغ الإجمالي' : 'Total Amount'}
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {isRtl ? `${amount} ريال` : `SAR ${amount}`}
            </span>
          </div>
        </div>
        
        {/* Payment Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Card Types */}
          <div className="flex space-x-4 mb-6 justify-center">
            <div className="p-2 border border-gray-200 dark:border-gray-700 rounded">
              <Image 
                src="/images/payment/visa.svg" 
                alt="Visa" 
                width={40} 
                height={25}
              />
            </div>
            <div className="p-2 border border-gray-200 dark:border-gray-700 rounded opacity-50">
              <Image 
                src="/images/payment/mastercard.svg" 
                alt="Mastercard" 
                width={40} 
                height={25}
              />
            </div>
            <div className="p-2 border border-gray-200 dark:border-gray-700 rounded opacity-50">
              <Image 
                src="/images/payment/amex.svg" 
                alt="American Express" 
                width={40} 
                height={25}
              />
            </div>
          </div>
          
          {errors.form && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
              {errors.form}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Card Number */}
            <div className="mb-4">
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'رقم البطاقة' : 'Card Number'}
              </label>
              <input
                type="text"
                id="cardNumber"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className={`w-full px-4 py-3 border ${errors.cardNumber ? 'border-red-500 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {errors.cardNumber && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cardNumber}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Expiry Date */}
              <div className="mb-4">
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                  {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                </label>
                <input
                  type="text"
                  id="expiryDate"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  placeholder="MM/YY"
                  className={`w-full px-4 py-3 border ${errors.expiryDate ? 'border-red-500 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                />
                {errors.expiryDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.expiryDate}</p>
                )}
              </div>
              
              {/* CVV */}
              <div className="mb-4">
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                  {isRtl ? 'رمز الأمان' : 'CVV'}
                </label>
                <input
                  type="text"
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  className={`w-full px-4 py-3 border ${errors.cvv ? 'border-red-500 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                />
                {errors.cvv && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cvv}</p>
                )}
              </div>
            </div>
            
            {/* Cardholder Name */}
            <div className="mb-6">
              <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'اسم حامل البطاقة' : 'Cardholder Name'}
              </label>
              <input
                type="text"
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className={`w-full px-4 py-3 border ${errors.cardholderName ? 'border-red-500 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {errors.cardholderName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cardholderName}</p>
              )}
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo disabled:bg-blue-400 transition-colors flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRtl ? 'جاري معالجة الدفع...' : 'Processing Payment...'}
                </>
              ) : (
                isRtl ? 'إتمام الدفع' : 'Pay Now'
              )}
            </button>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl ? 'معلوماتك مشفرة ومحمية' : 'Your information is encrypted and secure'}
              </p>
              <button
                type="button"
                onClick={() => router.back()}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-cairo"
              >
                {isRtl ? 'العودة إلى صفحة الدفع' : 'Return to checkout'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
