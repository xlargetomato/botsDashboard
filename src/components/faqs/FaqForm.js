'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';

const FaqForm = ({ faq = null, onSubmit, onCancel }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [formData, setFormData] = useState({
    question_en: '',
    question_ar: '',
    answer_en: '',
    answer_ar: '',
    order_index: 0,
    is_active: true
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (faq) {
      setFormData({
        question_en: faq.question_en || '',
        question_ar: faq.question_ar || '',
        answer_en: faq.answer_en || '',
        answer_ar: faq.answer_ar || '',
        order_index: faq.order_index || 0,
        is_active: faq.is_active !== undefined ? faq.is_active : true
      });
    }
  }, [faq]);
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.question_en.trim()) {
      newErrors.question_en = t('common.errors.required');
    }
    
    if (!formData.question_ar.trim()) {
      newErrors.question_ar = t('common.errors.required');
    }
    
    if (!formData.answer_en.trim()) {
      newErrors.answer_en = t('common.errors.required');
    }
    
    if (!formData.answer_ar.trim()) {
      newErrors.answer_ar = t('common.errors.required');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Reset form if it's a new FAQ (not editing)
      if (!faq) {
        setFormData({
          question_en: '',
          question_ar: '',
          answer_en: '',
          answer_ar: '',
          order_index: 0,
          is_active: true
        });
      }
    } catch (error) {
      console.error('Error submitting FAQ:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 sm:p-6 font-cairo">
      <h2 className={`text-xl font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'}`}>
        {faq ? t('common.admin.faq.editFaq') : t('common.admin.faq.addFaq')}
      </h2>
      
      <form onSubmit={handleSubmit} className={`space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* English Question */}
          <div>
            <label htmlFor="question_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.admin.faq.questionEn')} *
            </label>
            <input
              type="text"
              id="question_en"
              name="question_en"
              value={formData.question_en}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              dir="ltr"
            />
            {errors.question_en && (
              <p className="text-red-500 text-sm mt-1">{errors.question_en}</p>
            )}
          </div>

          {/* Arabic Question */}
          <div>
            <label htmlFor="question_ar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.admin.faq.questionAr')} *
            </label>
            <input
              type="text"
              id="question_ar"
              name="question_ar"
              value={formData.question_ar}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              dir="rtl"
            />
            {errors.question_ar && (
              <p className="text-red-500 text-sm mt-1">{errors.question_ar}</p>
            )}
          </div>

          {/* English Answer */}
          <div className="md:col-span-2">
            <label htmlFor="answer_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.admin.faq.answerEn')} *
            </label>
            <textarea
              id="answer_en"
              name="answer_en"
              value={formData.answer_en}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              dir="ltr"
            />
            {errors.answer_en && (
              <p className="text-red-500 text-sm mt-1">{errors.answer_en}</p>
            )}
          </div>

          {/* Arabic Answer */}
          <div className="md:col-span-2">
            <label htmlFor="answer_ar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.admin.faq.answerAr')} *
            </label>
            <textarea
              id="answer_ar"
              name="answer_ar"
              value={formData.answer_ar}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              dir="rtl"
            />
            {errors.answer_ar && (
              <p className="text-red-500 text-sm mt-1">{errors.answer_ar}</p>
            )}
          </div>

          {/* Active Status */}
          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('common.admin.faq.activeStatus')}
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 order-2 sm:order-1"
          >
            {t('common.admin.cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 order-1 sm:order-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                {t('common.admin.processing')}
              </span>
            ) : (
              faq ? t('common.admin.update') : t('common.admin.create')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FaqForm;
