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
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border-t-4 ${isPopular ? 'border-t-blue-500' : 'border-t-transparent'} transition-all transform hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full mt-5 overflow-visible`}>
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 -z-10"></div>
      
      {/* Popular badge with enhanced styling - fixed visibility issue */}
      {isPopular && (
        <div className="absolute -top-4 left-0 right-0 mx-auto w-max px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-full shadow-xl font-cairo transform transition-transform hover:scale-105 z-50 border-2 border-blue-400/40">
          {isRtl ? (
            <div className="flex items-center gap-1.5 flex-row-reverse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="inline-block text-center font-bold">الأكثر شعبية</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="inline-block text-center font-bold">Most Popular</span>
            </div>
          )}
        </div>
      )}
      
      {/* Header with improved styling */}
      <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} justify-between items-start mb-5`}>
        <h3 className="text-xl font-bold font-cairo text-gray-900 dark:text-white">
          {plan.name}
        </h3>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200/50 dark:border-blue-700/50 shadow-sm">
          {selectedType === 'yearly'
            ? isRtl ? 'سنوي' : 'Yearly'
            : selectedType === 'monthly'
              ? isRtl ? 'شهري' : 'Monthly'
              : isRtl ? 'أسبوعي' : 'Weekly'}
        </div>
      </div>
      
      {/* Price with enhanced styling - fixed RTL layout */}
      <div className="mb-6">
        {isRtl ? (
          <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-4 px-3 rounded-lg shadow-inner border border-gray-100 dark:border-gray-700">
            <span className="text-4xl font-bold font-cairo bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              {price.toFixed(2)}
            </span>
            <CurrencySymbol className="mx-1 text-2xl font-bold text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-cairo text-gray-500 dark:text-gray-400 mr-1">
              /{selectedType === 'weekly' 
                ? 'أسبوع'
                : selectedType === 'monthly'
                  ? 'شهر'
                  : 'سنة'}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-4 px-3 rounded-lg shadow-inner border border-gray-100 dark:border-gray-700">
            <span className="text-4xl font-bold font-cairo bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              {price.toFixed(2)}
            </span>
            <CurrencySymbol className="mx-2 text-2xl font-bold text-blue-600 dark:text-blue-400" />
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
          <p className="text-sm text-green-600 dark:text-green-400 mt-2.5 font-cairo text-center flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isRtl ? 'وفر 16% مقارنة بالاشتراك الشهري' : 'Save 16% compared to monthly'}
          </p>
        )}
      </div>
      
      <div className="mb-6 flex-grow">
        {/* Description with enhanced styling */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg mb-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
          <p className="text-gray-600 dark:text-gray-300 font-cairo leading-relaxed">
            {plan.description}
          </p>
        </div>
        
        {/* Features with enhanced styling */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 rtl:mr-0 rtl:ml-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white font-cairo text-lg">
              {isRtl ? 'المميزات' : 'Features'}
            </h4>
          </div>
          
          <ul className="space-y-3.5">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start group transition-all duration-300 hover:translate-x-1 rtl:hover:-translate-x-1">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 rtl:mr-0 rtl:ml-3 flex-shrink-0 mt-0.5 group-hover:bg-green-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-600 dark:text-green-400 group-hover:text-white transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700 dark:text-gray-300 font-cairo group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {isRtl ? (feature.ar || feature.en) : (feature.en || feature.ar)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Button with enhanced styling */}
      <div className="mt-auto pt-5">
        <button
          onClick={handleSelectPlan}
          className={`group relative w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-cairo transition-all duration-300 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''} flex items-center justify-center`}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></span>
          <span className="relative flex items-center">
            {isRtl ? 'اختر الخطة' : 'Select Plan'}
            <svg className={`w-4 h-4 ${isRtl ? 'mr-2 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M19 12H5m7 7l-7-7 7-7" : "M5 12h14m-7 7l7-7-7-7"} />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
