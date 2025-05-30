'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';

// Component to display payment method icons
const PaymentMethodIcon = ({ method }) => {
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
    <div className="w-8 h-8 flex items-center justify-center">
      <Image 
        src={iconPath}
        width={32}
        height={32}
        alt={`${method || 'Payment method'} icon`}
        className="object-contain"
      />
    </div>
  );
};

// Fetch data function for SWR
const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function SavedPaymentMethods({ onSelectMethod, selectedMethodId = null }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  // Use SWR to fetch saved payment methods
  const { data, error, mutate } = useSWR('/api/payments/methods', fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });
  
  const [selectedId, setSelectedId] = useState(selectedMethodId);
  
  // Update selected method when props change
  useEffect(() => {
    setSelectedId(selectedMethodId);
  }, [selectedMethodId]);
  
  // Handle payment method selection
  const handleSelectMethod = (method) => {
    setSelectedId(method.id);
    if (onSelectMethod) {
      onSelectMethod(method);
    }
  };
  
  // Handle payment method deletion
  const handleDeleteMethod = async (id, e) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف طريقة الدفع هذه؟' : 'Are you sure you want to delete this payment method?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/payments/methods', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        // Refresh the list of payment methods
        mutate();
        
        // If the deleted method was selected, clear selection
        if (id === selectedId) {
          setSelectedId(null);
          if (onSelectMethod) {
            onSelectMethod(null);
          }
        }
      } else {
        console.error('Failed to delete payment method');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };
  
  // Loading state
  if (!data && !error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="flex flex-col space-y-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center">
        <p className="text-red-500 dark:text-red-400">
          {isRtl ? 'حدث خطأ أثناء تحميل طرق الدفع المحفوظة' : 'Error loading saved payment methods'}
        </p>
      </div>
    );
  }
  
  const paymentMethods = data?.paymentMethods || [];
  
  // Empty state
  if (paymentMethods.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center border border-gray-200 dark:border-gray-700">
        <div className="rounded-full w-16 h-16 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 font-cairo">
          {isRtl ? 'لا توجد طرق دفع محفوظة' : 'No Saved Payment Methods'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 font-cairo">
          {isRtl 
            ? 'سيتم حفظ طرق الدفع الخاصة بك هنا عند إجراء عملية دفع جديدة' 
            : 'Your payment methods will be saved here when you make a new payment'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 font-cairo">
        {isRtl ? 'طرق الدفع المحفوظة' : 'Saved Payment Methods'}
      </h3>
      
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <div 
            key={method.id}
            onClick={() => handleSelectMethod(method)}
            className={`border ${
              selectedId === method.id 
                ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' 
                : 'border-gray-200 dark:border-gray-700'
            } rounded-lg p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md`}
          >
            <div className="flex items-center space-x-4">
              <PaymentMethodIcon method={method.method_type} />
              <div className={`${isRtl ? 'mr-4' : 'ml-4'}`}>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {method.method_type} {method.is_default && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                      {isRtl ? 'افتراضي' : 'Default'}
                    </span>
                  )}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {method.card_brand ? `${method.card_brand} - ` : ''}
                  •••• {method.last_four_digits || '****'}
                  {method.expires_at ? ` - ${isRtl ? 'تنتهي في' : 'Expires'} ${method.expires_at}` : ''}
                </p>
                {method.card_holder_name && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {method.card_holder_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={(e) => handleDeleteMethod(method.id, e)}
                className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isRtl ? 'حذف' : 'Delete'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
