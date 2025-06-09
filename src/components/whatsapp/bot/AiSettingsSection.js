'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function AiSettingsSection({ botId, initialAiSettings, isRtl, hasFeature }) {
  const [aiSettings, setAiSettings] = useState(initialAiSettings || { max_ai_per_day: 50, gpt_model: 'gpt-3.5-turbo' });
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  // Handler for updating AI settings
  const handleUpdateAiSettings = async () => {
    setSavingAiSettings(true);
    try {
      const response = await fetch(`/api/bots/${botId}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings)
      });
      
      if (response.ok) {
        toast.success(isRtl ? 'تم حفظ إعدادات الذكاء الاصطناعي بنجاح' : 'AI settings saved successfully');
      } else {
        console.error('Failed to update AI settings');
        toast.error(isRtl ? 'فشل في حفظ إعدادات الذكاء الاصطناعي' : 'Failed to save AI settings');
      }
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast.error(isRtl ? 'خطأ في حفظ إعدادات الذكاء الاصطناعي' : 'Error saving AI settings');
    } finally {
      setSavingAiSettings(false);
    }
  };

  // If feature is not available, show message
  if (!hasFeature('ai_replies')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {isRtl ? 'إعدادات الذكاء الاصطناعي' : 'AI Settings'}
        </h2>
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className={`${isRtl ? 'mr-3' : 'ml-3'}`}>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {isRtl ? 'ميزة غير متوفرة' : 'Feature Not Available'}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                <p>
                  {isRtl 
                    ? 'ميزة الردود الذكية غير متوفرة في باقتك الحالية. قم بالترقية للحصول على هذه الميزة.' 
                    : 'AI replies feature is not available in your current tier. Upgrade to get this feature.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isRtl ? 'إعدادات الذكاء الاصطناعي' : 'AI Settings'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isRtl 
          ? 'تكوين كيفية استخدام البوت للذكاء الاصطناعي للرد على الرسائل.' 
          : 'Configure how the bot uses AI to respond to messages.'}
      </p>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="max_ai_per_day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRtl ? 'الحد الأقصى للردود الذكية في اليوم' : 'Max AI Responses Per Day'}
          </label>
          <input
            type="number"
            id="max_ai_per_day"
            min="1"
            max="1000"
            value={aiSettings.max_ai_per_day}
            onChange={(e) => setAiSettings({...aiSettings, max_ai_per_day: parseInt(e.target.value)})}
            className="w-full md:w-64 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isRtl 
              ? 'عدد الردود الذكية التي يمكن للبوت إرسالها في اليوم الواحد.' 
              : 'The number of AI-generated responses the bot can send per day.'}
          </p>
        </div>
        
        <div>
          <label htmlFor="gpt_model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRtl ? 'نموذج GPT' : 'GPT Model'}
          </label>
          <select
            id="gpt_model"
            value={aiSettings.gpt_model}
            onChange={(e) => setAiSettings({...aiSettings, gpt_model: e.target.value})}
            className="w-full md:w-64 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isRtl 
              ? 'نموذج الذكاء الاصطناعي المستخدم لإنشاء الردود.' 
              : 'The AI model used to generate responses.'}
          </p>
        </div>
        
        <div>
          <button
            onClick={handleUpdateAiSettings}
            disabled={savingAiSettings}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm"
          >
            {savingAiSettings ? (
              <div className="flex items-center">
                <div className={`animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                {isRtl ? 'جاري الحفظ...' : 'Saving...'}
              </div>
            ) : (
              isRtl ? 'حفظ إعدادات الذكاء الاصطناعي' : 'Save AI Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 