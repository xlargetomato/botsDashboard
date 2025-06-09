'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BotInfoSection({ botData, setBotData, isRtl }) {
  const [editingName, setEditingName] = useState(false);
  const [botName, setBotName] = useState(botData?.bot?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Handler for updating bot name
  const handleUpdateBotName = async () => {
    if (!botName.trim()) return;
    
    setSavingName(true);
    try {
      const response = await fetch(`/api/bots/${botData.bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: botName })
      });
      
      if (response.ok) {
        // Update local state with new name
        setBotData(prev => ({
          ...prev,
          bot: { ...prev.bot, name: botName }
        }));
        setEditingName(false);
      } else {
        console.error('Failed to update bot name');
      }
    } catch (error) {
      console.error('Error updating bot name:', error);
    } finally {
      setSavingName(false);
    }
  };

  // Helper function to get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!botData) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          {editingName ? (
            <div className="flex items-center">
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-xl font-bold font-cairo text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleUpdateBotName}
                disabled={savingName}
                className="ml-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                {savingName ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  isRtl ? 'حفظ' : 'Save'
                )}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setBotName(botData.bot.name);
                }}
                className="ml-2 px-3 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white">
                {botData.bot.name}
              </h1>
              <button
                onClick={() => setEditingName(true)}
                className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          )}
          <div className="mt-2 flex items-center">
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(botData.bot.status)}`}>
              {botData.bot.status}
            </span>
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
              {isRtl ? 'الباقة: ' : 'Tier: '}
              {botData.bot.tier_name}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isRtl ? 'تم التفعيل: ' : 'Activated: '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {botData.bot.activated_at ? new Date(botData.bot.activated_at).toLocaleDateString() : isRtl ? 'غير مفعل بعد' : 'Not activated yet'}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRtl ? 'تنتهي في: ' : 'Expires: '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {botData.bot.expires_at ? new Date(botData.bot.expires_at).toLocaleDateString() : '-'}
            </span>
          </div>
          <div className="text-sm mt-1">
            {botData.bot.days_left > 0 ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {botData.bot.days_left} {isRtl ? 'يوم متبقي' : 'days left'}
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {isRtl ? 'منتهي الصلاحية' : 'Expired'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {isRtl ? 'حالة الاتصال' : 'Connection Status'}
        </h2>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full ${botData.bot.status === 'active' ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
            <span className="font-medium text-gray-900 dark:text-white">
              {botData.bot.status === 'active' 
                ? (isRtl ? 'مفعل' : 'Active') 
                : (isRtl ? 'غير مفعل' : 'Inactive')}
            </span>
          </div>
          {botData.bot.status !== 'active' && (
            <div className="mt-4">
              <Link href={`/dashboard/client/bots/setup/${botData.bot.id}`}>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm">
                  {isRtl ? 'إعداد الاتصال' : 'Setup Connection'}
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {isRtl ? 'الإحصائيات' : 'Statistics'}
        </h2>
        
        {botData.bot.features && botData.bot.features.find(f => f.feature_key === 'statistics')?.value !== false ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isRtl ? 'الرسائل المرسلة' : 'Messages Sent'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {botData.stats.messages_sent}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isRtl ? 'الرسائل المستلمة' : 'Messages Received'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {botData.stats.messages_received}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isRtl ? 'المستخدمين النشطين' : 'Active Users'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {botData.stats.active_users}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  {isRtl ? 'ميزة غير متوفرة' : 'Feature Not Available'}
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                  <p>
                    {isRtl 
                      ? 'الإحصائيات غير متوفرة في باقتك الحالية. قم بالترقية للحصول على هذه الميزة.' 
                      : 'Statistics are not available in your current tier. Upgrade to get this feature.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 