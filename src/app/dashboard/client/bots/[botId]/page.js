'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  BotInfoSection,
  WhatsAppStatusSection,
  WorkingHoursSection,
  BlockingRulesSection,
  AiSettingsSection,
  WelcomeMessageSection,
  ResponsesSection,
  CallBlockingSection
} from '@/components/whatsapp/bot';

export default function BotDetailsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const params = useParams();
  const botId = params.botId;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [botData, setBotData] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Reference to store the interval ID
  const statusIntervalRef = useRef(null);
  
  // Function to update WhatsApp status
  const updateWhatsAppStatus = async () => {
    if (!botId) return;
    
    try {
      const statusResponse = await fetch(`/api/bots/${botId}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        // Use the final connection state from the server
        const isConnected = statusData.whatsapp_connected || 
                          (statusData.session?.exists && statusData.connection_state?.authenticated);
        
        setBotData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            bot: {
              ...prev.bot,
              whatsapp_connected: isConnected
            }
          };
        });
      }
    } catch (error) {
      console.error('Error updating WhatsApp status:', error);
    }
  };

  // Check authentication status and fetch bot data
  useEffect(() => {
    const checkAuthAndFetchBot = async () => {
      try {
        const authResponse = await fetch('/api/user/profile');
        if (!authResponse.ok) {
          router.push('/login');
          return;
        }

        setAuthenticated(true);
        
        // Fetch bot details
        const botResponse = await fetch(`/api/bots/${botId}`);
        if (botResponse.ok) {
          const data = await botResponse.json();
          
          // Fetch WhatsApp status
          try {
            const statusResponse = await fetch(`/api/bots/${botId}/status?verify=true`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              
              // Use the final connection state from the server
              const isConnected = statusData.whatsapp_connected || 
                               (statusData.session?.exists && statusData.connection_state?.authenticated);
              
              // Add WhatsApp connection status to bot data
              data.bot.whatsapp_connected = isConnected;
            }
          } catch (statusError) {
            console.error('Error fetching WhatsApp status:', statusError);
            data.bot.whatsapp_connected = false;
          }
          
          setBotData(data);
        } else {
          console.error('Failed to fetch bot details');
          router.push('/dashboard/client/bots');
        }
      } catch (error) {
        console.error('Authentication check or bot fetch failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchBot();
    
    // Set up interval to periodically check WhatsApp status
    statusIntervalRef.current = setInterval(updateWhatsAppStatus, 30000); // Check every 30 seconds
    
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, [botId, router]);

  // Helper function to check if a feature is available in the bot's tier
  // Modified to make all features available
  const hasFeature = (featureKey) => {
    // Always return true to make all features available
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-400 font-cairo text-sm">
            {isRtl ? 'جاري تحميل بيانات البوت...' : 'Loading bot data...'}
          </p>
          </div>
    </div>
  );
  }

  if (!authenticated || !botData) {
    return null; // Will redirect in useEffect
  }

  // Define tab icons and labels
  const tabs = [
    {
      id: 'basic',
      label: isRtl ? 'المعلومات الأساسية' : 'Basic Info',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'working-hours',
      label: isRtl ? 'ساعات العمل' : 'Working Hours',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'blocking',
      label: isRtl ? 'حظر جهات الاتصال' : 'Blocking',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'call-blocking',
      label: isRtl ? 'حظر المكالمات' : 'Call Blocking',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
        </svg>
      )
    },
    {
      id: 'ai-settings',
      label: isRtl ? 'إعدادات الذكاء الاصطناعي' : 'AI Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'welcome-message',
      label: isRtl ? 'رسالة الترحيب' : 'Welcome Message',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
      )
    },
    {
      id: 'responses',
      label: isRtl ? 'الردود' : 'Responses',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <div className="max-w-7xl mx-auto font-cairo">
        {/* Header with back button and bot name */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <Link href="/dashboard/client/bots" className={`text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center ${isRtl ? 'ml-4' : 'mr-4'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-2 rotate-180' : 'mr-2'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
              <span className="font-medium">{isRtl ? 'العودة' : 'Back'}</span>
          </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {botData.bot.name}
                  </h1>
              <div className="flex items-center mt-1">
                <div className={`h-2 w-2 rounded-full ${botData.bot.whatsapp_connected ? 'bg-green-500' : 'bg-red-500'} ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {botData.bot.whatsapp_connected 
                    ? (isRtl ? 'واتساب متصل' : 'WhatsApp Connected') 
                    : (isRtl ? 'واتساب غير متصل' : 'WhatsApp Disconnected')}
                </span>
              </div>
            </div>
              </div>
          <div className="mt-2 md:mt-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300'
            }`}>
              {isRtl ? `الباقة ${botData.bot.tier_name}` : `Tier ${botData.bot.tier_name}`}
                </span>
          </div>
        </div>

        {/* Feature Navigation - Redesigned for better UX */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-1 p-1">
            {/* Basic Info - Moved to first position */}
              <button
                onClick={() => setActiveTab('basic')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                  activeTab === 'basic'
                  ? 'bg-gradient-to-br from-gray-500/10 to-blue-500/10 border border-gray-200 dark:border-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'basic'
                  ? 'bg-gradient-to-r from-gray-500 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'basic'
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'المعلومات الأساسية' : 'Basic Info'}
              </span>
              </button>

            {/* AI Settings */}
            <button 
              onClick={() => setActiveTab('ai-settings')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                activeTab === 'ai-settings' 
                  ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'ai-settings'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'ai-settings'
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'الذكاء الاصطناعي' : 'AI Settings'}
              </span>
            </button>

            {/* Working Hours */}
              <button
                onClick={() => setActiveTab('working-hours')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                  activeTab === 'working-hours'
                  ? 'bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-200 dark:border-green-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'working-hours'
                  ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-md'
                  : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'working-hours'
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'ساعات العمل' : 'Working Hours'}
              </span>
              </button>

            {/* Contact Blocking */}
                <button
                  onClick={() => setActiveTab('blocking')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                    activeTab === 'blocking'
                  ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'blocking'
                  ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-md'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'blocking'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'حظر جهات الاتصال' : 'Contact Blocking'}
              </span>
                </button>

            {/* Call Blocking */}
              <button
                onClick={() => setActiveTab('call-blocking')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                  activeTab === 'call-blocking'
                  ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'call-blocking'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                  : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'call-blocking'
                  ? 'text-purple-700 dark:text-purple-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'حظر المكالمات' : 'Call Blocking'}
              </span>
              </button>

            {/* Welcome Message */}
              <button
                onClick={() => setActiveTab('welcome-message')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                  activeTab === 'welcome-message'
                  ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-200 dark:border-yellow-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'welcome-message'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md'
                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'welcome-message'
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'رسالة الترحيب' : 'Welcome Message'}
              </span>
              </button>

            {/* Responses */}
              <button
                onClick={() => setActiveTab('responses')}
              className={`flex flex-col items-center justify-center p-4 transition-all duration-200 rounded-lg ${
                  activeTab === 'responses'
                  ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-200 dark:border-cyan-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                activeTab === 'responses'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-sm font-medium text-center ${
                activeTab === 'responses'
                  ? 'text-cyan-700 dark:text-cyan-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {isRtl ? 'الردود' : 'Responses'}
              </span>
              </button>
          </div>
          </div>

        {/* Main content area with tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Tab Content with subtle animation */}
          <div className="p-6 font-cairo animate-fade-in">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <BotInfoSection 
                  botData={botData} 
                  setBotData={setBotData} 
                  isRtl={isRtl} 
                />
                <WhatsAppStatusSection 
                  botId={botId} 
                  isRtl={isRtl} 
                />
              </div>
            )}

            {/* Working Hours Tab */}
            {activeTab === 'working-hours' && (
              <WorkingHoursSection 
                botId={botId} 
                initialWorkingHours={botData.settings.working_hours || []} 
                isRtl={isRtl} 
              />
            )}

            {/* Blocking Tab */}
            {activeTab === 'blocking' && (
              <BlockingRulesSection 
                botId={botId} 
                initialBlockRules={botData.settings.block_rules || []} 
                isRtl={isRtl} 
                hasFeature={hasFeature}
              />
            )}

            {/* Call Blocking Tab */}
            {activeTab === 'call-blocking' && (
              <CallBlockingSection 
                botId={botId}
                isRtl={isRtl}
              />
            )}

            {/* AI Settings Tab */}
            {activeTab === 'ai-settings' && (
              <AiSettingsSection 
                botId={botId} 
                initialAiSettings={botData.settings.ai_settings} 
                isRtl={isRtl} 
                hasFeature={hasFeature}
              />
            )}

            {/* Welcome Message Tab */}
            {activeTab === 'welcome-message' && (
              <WelcomeMessageSection 
                botId={botId} 
                initialWelcomeMessage={botData.settings.welcome_message} 
                isRtl={isRtl} 
              />
            )}

            {/* Responses Tab */}
            {activeTab === 'responses' && (
              <ResponsesSection 
                botId={botId}
                isRtl={isRtl}
              />
            )}
                  </div>
                </div>
                
        {/* Quick Actions Floating Button */}
        <div className="fixed bottom-6 right-6">
          <div className="relative group">
            <button className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-blue-500/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
              </svg>
                              </button>
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
              <div className="py-2">
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-cairo text-left">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  {isRtl ? 'إضافة رد جديد' : 'Add Response'}
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-cairo text-left">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {isRtl ? 'الدعم' : 'Get Support'}
                </button>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 