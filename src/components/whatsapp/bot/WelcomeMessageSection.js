'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function WelcomeMessageSection({ botId, initialWelcomeMessage, isRtl }) {
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage || { is_default: true, message: '' });
  const [savingWelcomeMessage, setSavingWelcomeMessage] = useState(false);

  // Handler for updating welcome message
  const handleUpdateWelcomeMessage = async () => {
    setSavingWelcomeMessage(true);
    try {
      const response = await fetch(`/api/bots/${botId}/welcome-message`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(welcomeMessage)
      });
      
      if (response.ok) {
        toast.success(isRtl ? 'تم حفظ رسالة الترحيب بنجاح' : 'Welcome message saved successfully');
      } else {
        console.error('Failed to update welcome message');
        toast.error(isRtl ? 'فشل في حفظ رسالة الترحيب' : 'Failed to save welcome message');
      }
    } catch (error) {
      console.error('Error updating welcome message:', error);
      toast.error(isRtl ? 'خطأ في حفظ رسالة الترحيب' : 'Error saving welcome message');
    } finally {
      setSavingWelcomeMessage(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isRtl ? 'رسالة الترحيب' : 'Welcome Message'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isRtl 
          ? 'تكوين الرسالة التي يرسلها البوت عندما يتصل بك شخص ما لأول مرة.' 
          : 'Configure the message that the bot sends when someone contacts you for the first time.'}
      </p>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="radio"
            id="default_message"
            name="welcome_message_type"
            checked={welcomeMessage.is_default}
            onChange={() => setWelcomeMessage({...welcomeMessage, is_default: true})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
          />
          <label htmlFor="default_message" className={`${isRtl ? 'mr-2' : 'ml-2'} block text-sm text-gray-700 dark:text-gray-300`}>
            {isRtl ? 'استخدام الرسالة الافتراضية' : 'Use Default Message'}
          </label>
        </div>
        
        <div className="flex items-start">
          <input
            type="radio"
            id="custom_message"
            name="welcome_message_type"
            checked={!welcomeMessage.is_default}
            onChange={() => setWelcomeMessage({...welcomeMessage, is_default: false})}
            className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
          />
          <div className={`${isRtl ? 'mr-2' : 'ml-2'}`}>
            <label htmlFor="custom_message" className="block text-sm text-gray-700 dark:text-gray-300">
              {isRtl ? 'استخدام رسالة مخصصة' : 'Use Custom Message'}
            </label>
            {!welcomeMessage.is_default && (
              <textarea
                id="message"
                value={welcomeMessage.message}
                onChange={(e) => setWelcomeMessage({...welcomeMessage, message: e.target.value})}
                rows="4"
                className="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={isRtl ? 'أدخل رسالة الترحيب المخصصة هنا...' : 'Enter your custom welcome message here...'}
              />
            )}
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleUpdateWelcomeMessage}
            disabled={savingWelcomeMessage || (!welcomeMessage.is_default && !welcomeMessage.message)}
            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm ${
              (!welcomeMessage.is_default && !welcomeMessage.message) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {savingWelcomeMessage ? (
              <div className="flex items-center">
                <div className={`animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                {isRtl ? 'جاري الحفظ...' : 'Saving...'}
              </div>
            ) : (
              isRtl ? 'حفظ رسالة الترحيب' : 'Save Welcome Message'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 