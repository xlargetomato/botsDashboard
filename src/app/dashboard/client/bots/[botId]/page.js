'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/ui/MainLayout';
import useLanguage from '@/hooks/useLanguage';
import { Tab } from '@headlessui/react';

// Import WhatsApp components
import {
  ConnectionSection,
  ResponsesSection,
  CallBlockingSection,
  SendMessageSection,
  MessageHistorySection
} from '@/components/whatsapp';

export default function BotDetailsPage() {
  const { botId } = useParams();
  const router = useRouter();
  const { isRtl } = useLanguage();
  
  // State
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('connection');
  
  // Function to fetch the bot details
  const fetchBot = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bots/${botId}`);
      
      if (response.ok) {
        const data = await response.json();
        setBot(data);
      } else if (response.status === 404) {
        router.push('/dashboard/client/bots');
      } else {
        console.error('Failed to fetch bot details');
      }
    } catch (error) {
      console.error('Error fetching bot details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Fetch bot details on component mount
  useEffect(() => {
    fetchBot();
  }, [botId]);
  
  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {bot?.name || 'Bot Details'}
          </h1>
          
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/dashboard/client/bots')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md"
            >
              {isRtl ? 'العودة إلى قائمة الروبوتات' : 'Back to Bots List'}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('connection')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'connection'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {isRtl ? 'الاتصال' : 'Connection'}
              </button>
              
              <button
                onClick={() => handleTabChange('responses')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'responses'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {isRtl ? 'الردود التلقائية' : 'Auto Responses'}
              </button>
              
              <button
                onClick={() => handleTabChange('call-blocking')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'call-blocking'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {isRtl ? 'حظر المكالمات' : 'Call Blocking'}
              </button>
              
              <button
                onClick={() => handleTabChange('send')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'send'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {isRtl ? 'إرسال رسالة' : 'Send Message'}
              </button>
              
              <button
                onClick={() => handleTabChange('history')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'history'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {isRtl ? 'سجل الرسائل' : 'Message History'}
              </button>
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'connection' && (
              <ConnectionSection botId={botId} isRtl={isRtl} />
            )}
            
            {activeTab === 'responses' && (
              <ResponsesSection botId={botId} isRtl={isRtl} />
            )}
            
            {activeTab === 'call-blocking' && (
              <CallBlockingSection botId={botId} isRtl={isRtl} />
            )}
            
            {activeTab === 'send' && (
              <SendMessageSection botId={botId} isRtl={isRtl} />
            )}
            
            {activeTab === 'history' && (
              <MessageHistorySection botId={botId} isRtl={isRtl} />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 