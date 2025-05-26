'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ClientFaq = ({ faqs = [] }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!faqs || faqs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('common.client.faq.noFaqsAvailable')}</p>
      </div>
    );
  }

  // Filter active FAQs and sort by order_index
  const activeFaqs = faqs
    .filter(faq => faq.is_active)
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto font-cairo" dir={isRtl ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold mb-8 text-center font-cairo text-gray-900 dark:text-white">
        {t('common.client.faq.frequentlyAskedQuestions')}
      </h2>
      
      <div className="space-y-4">
        {activeFaqs.map((faq, index) => (
          <div key={faq.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <button
              onClick={() => toggleFaq(index)}
              className={`w-full flex items-center ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'} justify-between p-4 font-medium text-lg font-cairo text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150`}
              dir={isRtl ? 'rtl' : 'ltr'}
              aria-expanded={openIndex === index}
              aria-controls={`faq-content-${index}`}
            >
              <span className="flex-1 pe-4">
                {isRtl ? faq.question_ar : faq.question_en}
              </span>
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isRtl ? 'ms-2' : 'me-2'} ${openIndex === index ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'} transition-colors duration-200`}>
                {openIndex === index ? (
                  <ChevronUp className="text-blue-600 dark:text-blue-400" size={18} />
                ) : (
                  <ChevronDown className="text-gray-600 dark:text-gray-400" size={18} />
                )}
              </div>
            </button>
            
            <div 
              id={`faq-content-${index}`}
              className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'}`}
            >
              {openIndex === index && (
                <div 
                  className="p-4 text-gray-600 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <p className="font-cairo">{isRtl ? faq.answer_ar : faq.answer_en}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {activeFaqs.length === 0 && (
        <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 font-cairo">{t('common.client.faq.noFaqsAvailable')}</p>
        </div>
      )}
    </div>
  );
};

export default ClientFaq;
