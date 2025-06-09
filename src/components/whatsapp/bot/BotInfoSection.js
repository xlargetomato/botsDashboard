'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function BotInfoSection({ botData, setBotData, isRtl }) {
  const [editingName, setEditingName] = useState(false);
  const [botName, setBotName] = useState(botData?.bot?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(botData.bot.name);
  const [updating, setUpdating] = useState(false);
  const [deletingConfirm, setDeletingConfirm] = useState(false);

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
        toast.success(isRtl ? 'تم تحديث اسم البوت بنجاح' : 'Bot name updated successfully');
      } else {
        toast.error(isRtl ? 'فشل تحديث اسم البوت' : 'Failed to update bot name');
      }
    } catch (error) {
      console.error('Error updating bot name:', error);
      toast.error(isRtl ? 'خطأ في تحديث اسم البوت' : 'Error updating bot name');
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 font-cairo">
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
                className={`${isRtl ? 'mr-2' : 'ml-2'} px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md`}
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
                className={`${isRtl ? 'mr-2' : 'ml-2'} px-3 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md`}
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
                className={`${isRtl ? 'mr-2' : 'ml-2'} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300`}
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
            <span className={`${isRtl ? 'mr-4' : 'ml-4'} text-sm text-gray-500 dark:text-gray-400`}>
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
            <div className={`h-3 w-3 rounded-full ${botData.bot.status === 'active' ? 'bg-green-500' : 'bg-red-500'} ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
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
              <div className={`${isRtl ? 'mr-3' : 'ml-3'}`}>
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-1 font-cairo">
            {isRtl ? 'اسم البوت' : 'Bot Name'}
          </label>
          <div className="flex items-center">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 mr-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={isRtl ? 'أدخل اسم البوت...' : 'Enter bot name...'}
                />
                <button
                  onClick={async () => {
                    if (!editedName.trim()) return;
                    
                    setUpdating(true);
                    try {
                      const response = await fetch(`/api/bots/${botData.bot.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: editedName.trim() })
                      });
                      
                      if (response.ok) {
                        const updatedBot = await response.json();
                        setBotData({ ...botData, bot: updatedBot });
                        setIsEditing(false);
                        toast.success(isRtl ? 'تم تحديث اسم البوت بنجاح' : 'Bot name updated successfully');
                      } else {
                        toast.error(isRtl ? 'فشل تحديث اسم البوت' : 'Failed to update bot name');
                      }
                    } catch (error) {
                      console.error('Error updating bot name:', error);
                      toast.error(isRtl ? 'خطأ في تحديث اسم البوت' : 'Error updating bot name');
                    } finally {
                      setUpdating(false);
                    }
                  }}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-cairo"
                >
                  {updating ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      {isRtl ? 'جاري التحديث...' : 'Updating...'}
                    </div>
                  ) : (
                    isRtl ? 'حفظ' : 'Save'
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(botData.bot.name);
                  }}
                  className="px-4 py-2 ml-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 font-cairo"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-gray-900 dark:text-white font-cairo">{botData.bot.name}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-cairo"
                >
                  {isRtl ? 'تعديل' : 'Edit'}
                </button>
              </>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
            {isRtl ? 'معرف البوت' : 'Bot ID'}
          </label>
          <div className="text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
            {botData.bot.id}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
            {isRtl ? 'تاريخ الإنشاء' : 'Created At'}
          </label>
          <div className="text-gray-900 dark:text-white font-cairo">
            {new Date(botData.bot.created_at).toLocaleString()}
          </div>
        </div>
        
        <div className="pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 font-cairo">
            {isRtl ? 'خطة الاشتراك' : 'Subscription Plan'}
          </h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="font-medium text-blue-800 dark:text-blue-300 mb-1 font-cairo">
              {botData.bot.tier_name}
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400 font-cairo">
              {isRtl 
                ? 'لترقية خطتك، يرجى الاتصال بفريق المبيعات لدينا.' 
                : 'To upgrade your plan, please contact our sales team.'}
            </p>
          </div>
        </div>
        
        <div className="pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 font-cairo">
            {isRtl ? 'خيارات متقدمة' : 'Advanced Options'}
          </h3>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <h4 className="font-medium text-red-800 dark:text-red-300 mb-2 font-cairo">
              {isRtl ? 'حذف البوت' : 'Delete Bot'}
            </h4>
            <p className="text-sm text-red-700 dark:text-red-400 mb-3 font-cairo">
              {isRtl 
                ? 'سيؤدي حذف البوت إلى إزالة جميع البيانات المرتبطة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء.' 
                : 'Deleting the bot will permanently remove all associated data. This action cannot be undone.'}
            </p>
            
            {deletingConfirm ? (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 rtl:space-x-reverse">
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-cairo"
                  onClick={async () => {
                    // Add delete functionality here
                    toast.error(isRtl ? 'عفواً، هذه الميزة غير متاحة حالياً' : 'Sorry, this feature is not available yet');
                    setDeletingConfirm(false);
                  }}
                >
                  {isRtl ? 'نعم، احذف البوت' : 'Yes, Delete Bot'}
                </button>
                <button
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 font-cairo"
                  onClick={() => setDeletingConfirm(false)}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                className="px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800/60 font-cairo"
                onClick={() => setDeletingConfirm(true)}
              >
                {isRtl ? 'حذف البوت' : 'Delete Bot'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 