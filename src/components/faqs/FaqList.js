'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { Trash, Pencil, Check, X, Plus, ArrowUp, ArrowDown } from 'lucide-react';

const FaqList = ({ faqs, onEdit, onDelete, onReorder }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [displayFaqs, setDisplayFaqs] = useState([]);

  useEffect(() => {
    if (faqs && faqs.length > 0) {
      setDisplayFaqs([...faqs].sort((a, b) => a.order_index - b.order_index));
    } else {
      setDisplayFaqs([]);
    }
  }, [faqs]);

  const handleMoveUp = (index) => {
    if (index === 0) return;
    
    const newFaqs = [...displayFaqs];
    const currentFaq = newFaqs[index];
    const prevFaq = newFaqs[index - 1];
    
    // Swap order_index values
    const tempOrderIndex = currentFaq.order_index;
    currentFaq.order_index = prevFaq.order_index;
    prevFaq.order_index = tempOrderIndex;
    
    // Swap positions in array
    newFaqs[index] = prevFaq;
    newFaqs[index - 1] = currentFaq;
    
    setDisplayFaqs(newFaqs);
    
    if (onReorder) {
      onReorder([
        { id: currentFaq.id, order_index: currentFaq.order_index },
        { id: prevFaq.id, order_index: prevFaq.order_index }
      ]);
    }
  };

  const handleMoveDown = (index) => {
    if (index === displayFaqs.length - 1) return;
    
    const newFaqs = [...displayFaqs];
    const currentFaq = newFaqs[index];
    const nextFaq = newFaqs[index + 1];
    
    // Swap order_index values
    const tempOrderIndex = currentFaq.order_index;
    currentFaq.order_index = nextFaq.order_index;
    nextFaq.order_index = tempOrderIndex;
    
    // Swap positions in array
    newFaqs[index] = nextFaq;
    newFaqs[index + 1] = currentFaq;
    
    setDisplayFaqs(newFaqs);
    
    if (onReorder) {
      onReorder([
        { id: currentFaq.id, order_index: currentFaq.order_index },
        { id: nextFaq.id, order_index: nextFaq.order_index }
      ]);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('common.admin.faq.manageFaqs')}</h2>
        <button
          onClick={() => onEdit(null)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center whitespace-nowrap self-start"
        >
          <Plus size={16} className="me-2" />
          {t('common.admin.faq.addNew')}
        </button>
      </div>
      
      {displayFaqs.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-gray-500">{t('common.admin.faq.noFaqs')}</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          {/* Desktop View - Table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider`}>
                    {t('common.admin.faq.question')}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32`}>
                    {t('common.admin.status')}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24`}>
                    {t('common.admin.order')}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-36`}>
                    {t('common.admin.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayFaqs.map((faq, index) => (
                  <tr key={faq.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium" dir={isRtl ? 'rtl' : 'ltr'}>
                          {isRtl ? faq.question_ar : faq.question_en}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {faq.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                          <Check size={12} className="me-1" />
                          {t('common.admin.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                          <X size={12} className="me-1" />
                          {t('common.admin.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded ${index === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === displayFaqs.length - 1}
                          className={`p-1 rounded ${index === displayFaqs.length - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEdit(faq)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title={t('common.admin.edit')}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(faq.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          title={t('common.admin.delete')}
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile View - Cards */}
          <div className="md:hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayFaqs.map((faq, index) => (
                <div key={faq.id} className="p-4 bg-white dark:bg-gray-800">
                  <div className={`flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-between items-start mb-3`}>
                    <p 
                      className="font-medium text-gray-900 dark:text-white mb-2 flex-1" 
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      {isRtl ? faq.question_ar : faq.question_en}
                    </p>
                    
                    <div className={`flex ${isRtl ? 'space-x-reverse space-x-2 me-3' : 'space-x-2 ms-3'}`}>
                      <button
                        onClick={() => onEdit(faq)}
                        className="text-blue-600 dark:text-blue-400 p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full"
                        title={t('common.admin.edit')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(faq.id)}
                        className="text-red-600 dark:text-red-400 p-1.5 bg-red-50 dark:bg-red-900/30 rounded-full"
                        title={t('common.admin.delete')}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`flex flex-wrap gap-3 items-center ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-between`}>
                    <div>
                      {faq.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                          <Check size={12} className={isRtl ? 'ms-1' : 'me-1'} />
                          {t('common.admin.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                          <X size={12} className={isRtl ? 'ms-1' : 'me-1'} />
                          {t('common.admin.inactive')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={`p-2 ${isRtl ? 'rounded-e-md' : 'rounded-s-md'} ${index === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === displayFaqs.length - 1}
                        className={`p-2 ${isRtl ? 'rounded-s-md' : 'rounded-e-md'} ${index === displayFaqs.length - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaqList;
