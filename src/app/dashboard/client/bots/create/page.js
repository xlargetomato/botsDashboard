'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { useTranslation } from '@/lib/i18n/config';

export default function CreateBotPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [botName, setBotName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState(null);

  useEffect(() => {
    // Get subscription ID from URL query parameter
    const subId = searchParams.get('subId');
    if (!subId) {
      // Redirect back to subscription selection if no subscription ID
      router.push('/dashboard/client/bots/new');
      return;
    }
    setSubscriptionId(subId);
  }, [searchParams, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subscriptionId) {
      setError('Missing subscription ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the API to create a new bot
      const response = await fetch('/api/bots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          bot_name: botName.trim() || 'MyBot'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bot');
      }

      // Redirect to the connect page with the bot ID
      router.push(`/dashboard/client/bots/${data.bot_id}/connect`);
    } catch (err) {
      console.error('Error creating bot:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const content = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">
            {isRtl ? 'إنشاء بوت جديد' : 'Create New Bot'}
          </h1>
          <Link
            href="/dashboard/client/bots/new"
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-cairo"
          >
            {isRtl ? 'العودة إلى الاشتراكات ←' : '← Back to Subscriptions'}
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="botName" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo"
              >
                {isRtl ? 'اسم البوت' : 'Bot Name'}
              </label>
              <input
                type="text"
                id="botName"
                name="botName"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder={isRtl ? 'أدخل اسم البوت' : 'Enter bot name'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                maxLength={100}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl ? 'سيتم استخدام "MyBot" إذا تركت هذا الحقل فارغًا' : 'Will use "MyBot" if left empty'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md font-cairo">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-cairo ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isRtl ? 'جارٍ الإنشاء...' : 'Creating...'}
                  </span>
                ) : (
                  <span>
                    {isRtl ? 'التالي: إنشاء رمز QR' : 'Next: Generate QR'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <div className="w-full">
        {content()}
      </div>
    </MainLayout>
  );
} 