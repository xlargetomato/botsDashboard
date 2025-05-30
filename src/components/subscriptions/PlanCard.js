import React, { useState } from 'react';
import { FaCheckCircle, FaInfoCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const PlanCard = ({ 
  plan, 
  isSelected, 
  onSelect, 
  subscriptionType, 
  isRtl, 
  language
}) => {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  
  // Use Arabic name/description if language is Arabic
  const displayName = language === 'ar' ? plan.name_ar || plan.name : plan.name;
  const displayDescription = language === 'ar' ? plan.description_ar || plan.description : plan.description;
  const features = language === 'ar' ? plan.features_ar || plan.features : plan.features;
  
  // Initially hide all features until dropdown is clicked
  const visibleFeatures = showAllFeatures ? features : [];
  const hasMoreFeatures = features.length > 0;
  
  return (
    <div 
      className={`plan-card relative rounded-xl overflow-hidden transition-all duration-300 ${
        isSelected 
          ? 'border-2 border-blue-500 dark:border-blue-400 shadow-lg transform scale-[1.02]' 
          : 'border border-gray-200 dark:border-gray-700 hover:shadow-md'
      } bg-white dark:bg-gray-800 flex flex-col`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {plan.isPopular && (
        <div 
          className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
          style={plan.highlight_color ? { backgroundColor: plan.highlight_color } : {}}
        >
          {language === 'ar' ? 'الأكثر شعبية' : 'POPULAR'}
        </div>
      )}
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 font-sans cairo-font">{displayName}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 font-sans cairo-font">{displayDescription}</p>
        
        <div className="pricing mb-6">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {plan.price.toFixed(2)}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">
            {language === 'ar' ? 'ر.س.' : 'SAR'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 font-sans cairo-font">
            /{language === 'ar' 
              ? (subscriptionType === 'weekly' 
                ? 'أسبوعيًا' 
                : subscriptionType === 'monthly' 
                  ? 'شهريًا' 
                  : 'سنويًا') 
              : (subscriptionType === 'weekly' 
                ? 'week' 
                : subscriptionType === 'monthly' 
                  ? 'month' 
                  : 'year')}
          </span>
        </div>
        
        {subscriptionType === 'yearly' && (
          <div className="savings-badge bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm px-3 py-1 rounded-full inline-block mb-4 font-sans cairo-font">
            {language === 'ar' ? 'وفر 20٪' : 'Save 20%'}
          </div>
        )}
        
        {subscriptionType === 'weekly' && (
          <div className="weekly-badge bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm px-3 py-1 rounded-full inline-block mb-4 font-sans cairo-font">
            {language === 'ar' ? 'دفع أسبوعي' : 'Weekly payment'}
          </div>
        )}
        
        <button
          onClick={() => onSelect(plan)}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isSelected 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
          }`}
          style={isSelected && plan.highlight_color ? { backgroundColor: plan.highlight_color } : {}}
        >
          <span className="cairo">
            {isSelected 
              ? (language === 'ar' ? 'مختار' : 'Selected') 
              : (language === 'ar' ? 'اختر هذه الخطة' : 'Select This Plan')}
          </span>
        </button>
      </div>
      
      <div className="features-section mt-auto bg-gray-50 dark:bg-gray-850 p-6">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 font-sans cairo-font">
          {language === 'ar' ? 'المميزات' : 'Features'}
        </h4>
        
        <ul className="space-y-3">
          {visibleFeatures.map((feature, index) => (
            <li key={index} className="flex items-start">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <span className="ml-2 text-gray-600 dark:text-gray-300 font-sans cairo-font">{feature}</span>
            </li>
          ))}
        </ul>
        
        {hasMoreFeatures && (
          <button
            onClick={() => setShowAllFeatures(prev => !prev)}
            className="mt-3 text-blue-600 dark:text-blue-400 flex items-center text-sm font-medium hover:underline"
          >
            <span className="font-sans cairo-font">
              {showAllFeatures 
                ? (language === 'ar' ? 'عرض أقل' : 'Show Less') 
                : (language === 'ar' ? 'عرض المميزات' : 'Show Features')}
            </span>
            {showAllFeatures ? <FaChevronUp className="ml-1" /> : <FaChevronDown className="ml-1" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanCard;
