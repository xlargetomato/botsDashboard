'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import AdminLayout from '@/components/layouts/AdminLayout';
import { FiCpu } from 'react-icons/fi';

export default function AdminBotsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <AdminLayout>
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiCpu className={`h-6 w-6 text-purple-600 dark:text-purple-400 ${isRtl ? 'ml-3' : 'mr-3'}`} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'إدارة الروبوتات' : 'Bot Management'}
            </h1>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-cairo">
          {isRtl ? 'إدارة وتكوين الروبوتات في النظام' : 'Manage and configure bots in the system'}
        </p>
      </div>

      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center" dir={isRtl ? "rtl" : "ltr"}>
          <FiCpu className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white font-cairo">
            {isRtl ? 'ميزة الروبوتات قادمة قريبًا' : 'Bot Feature Coming Soon'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-cairo">
            {isRtl 
              ? 'هذه الميزة قيد التطوير حاليًا وستكون متاحة في المستقبل القريب.'
              : 'This feature is currently under development and will be available in the near future.'}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
