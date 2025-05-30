'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { useRouter } from 'next/navigation';
import CurrencySymbol from './CurrencySymbol';

export default function SubscriptionPlan({ plan, selectedType = 'yearly', isPopular = false }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  
  // Get price based on selected subscription type
  let price;
  switch (selectedType) {
    case 'weekly':
      price = parseFloat(plan.price_weekly) || parseFloat(plan.price_monthly) / 4 || 0;
      break;
    case 'monthly':
      price = parseFloat(plan.price_monthly) || 0;
      break;
    case 'yearly':
    default:
      price = parseFloat(plan.price_yearly) || 0;
      break;
  }
  
  // Parse features and handle different formats
  let features = [];
  try {
    if (typeof plan.features === 'string') {
      // Try to parse JSON string
      const parsedFeatures = JSON.parse(plan.features);
      
      // Check if the features are in the bilingual format
      if (parsedFeatures.length > 0 && parsedFeatures[0] && typeof parsedFeatures[0] === 'object') {
        if (parsedFeatures[0].en || parsedFeatures[0].ar) {
          // Bilingual format
          features = parsedFeatures;
        } else {
          // Unknown object format, convert to bilingual
          features = parsedFeatures.map(feature => ({
            en: String(feature),
            ar: String(feature)
          }));
        }
      } else if (Array.isArray(parsedFeatures)) {
        // Simple array format, convert to bilingual
        features = parsedFeatures.map(feature => ({
          en: String(feature),
          ar: String(feature)
        }));
      }
    } else if (Array.isArray(plan.features)) {
      // Already an array
      if (plan.features.length > 0 && plan.features[0] && typeof plan.features[0] === 'object') {
        // Likely already in bilingual format
        features = plan.features;
      } else {
        // Convert to bilingual format
        features = plan.features.map(feature => ({
          en: String(feature),
          ar: String(feature)
        }));
      }
    }
  } catch (error) {
    console.error('Error parsing plan features:', error);
    // Fallback to empty features array
    features = [];
  }
  
  const handleSelectPlan = () => {
    // Store selected plan in session storage with explicit subscription type
    console.log(`Selecting plan with type: ${selectedType}`);
    
    sessionStorage.setItem('selectedPlan', JSON.stringify({
      id: plan.id,
      name: plan.name,
      price: price,
      type: selectedType,
      subscription_type: selectedType // Add explicit subscription_type field
    }));
    
    // Navigate to checkout
    router.push('/dashboard/client/subscriptions/checkout');
  };
  
  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-t-4 ${isPopular ? 'border-t-blue-500' : 'border-t-transparent'} transition-all transform hover:-translate-y-1 hover:shadow-xl flex flex-col h-full`}>
      {isPopular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-max px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full shadow-md font-cairo">
          {isRtl ? 'الأكثر شعبية' : 'Most Popular'}
        </div>
      )}
      <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} justify-between items-start mb-4`}>
        <h3 className="text-xl font-bold font-cairo text-gray-900 dark:text-white">
          {plan.name}
        </h3>
        <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
          {selectedType === 'yearly'
            ? isRtl ? 'سنوي' : 'Yearly'
            : selectedType === 'monthly'
              ? isRtl ? 'شهري' : 'Monthly'
              : isRtl ? 'أسبوعي' : 'Weekly'}
        </div>

      </div>
      
      <div className="mb-6">
        {isRtl ? (
          <div className="flex flex-row-reverse items-center justify-center">
            <span className="text-lg font-cairo text-gray-500 dark:text-gray-400 mr-1">
              /{selectedType === 'weekly' 
                ? 'أسبوع'
                : selectedType === 'monthly'
                  ? 'شهر'
                  : 'سنة'}
            </span>
            <span className="text-4xl font-bold font-cairo text-gray-900 dark:text-white">
              {price.toFixed(2)}
            </span>
            <CurrencySymbol className="mr-1 text-2xl font-bold text-gray-900 dark:text-white" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-4xl font-bold font-cairo text-gray-900 dark:text-white">
              {price.toFixed(2)}
            </span>
            <CurrencySymbol className="mx-2 text-2xl font-bold text-gray-900 dark:text-white" />
            <span className="text-lg font-cairo text-gray-500 dark:text-gray-400 ms-1">
              /{selectedType === 'weekly' 
                ? 'week'
                : selectedType === 'monthly'
                  ? 'month'
                  : 'year'}
            </span>
          </div>
        )}

        {selectedType === 'yearly' && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-cairo">
            {isRtl ? 'وفر 16% مقارنة بالاشتراك الشهري' : 'Save 16% compared to monthly'}
          </p>
        )}
      </div>
      
      <div className="mb-6">
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-4">
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {plan.description}
          </p>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-bold text-gray-900 dark:text-white mb-3 font-cairo">
            {isRtl ? 'المميزات' : 'Features'}
          </h4>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-green-500 ${isRtl ? 'ms-2' : 'me-2'} mt-0.5 flex-shrink-0`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-300 font-cairo">
                  {isRtl ? (feature.ar || feature.en) : (feature.en || feature.ar)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mt-auto pt-4">
        <button
          onClick={handleSelectPlan}
          className={`w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo transition-colors flex items-center justify-center ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          {isRtl ? 'اختر الخطة' : 'Select Plan'}
        </button>
      </div>
    </div>
  );
}
