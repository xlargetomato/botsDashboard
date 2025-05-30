'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { FiMenu, FiX } from 'react-icons/fi';
import { useTranslation } from '@/lib/i18n/config';
import { useAuth } from '@/lib/auth/AuthContext';
import AdminSidebar from '@/components/dashboard/AdminSidebar';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === 'ar';

  // Using AdminSidebar component instead of defining navigation items here

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 ${isRtl ? 'rtl' : 'ltr'} overflow-hidden`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-10 w-64 transform bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col ${
        sidebarOpen ? 'translate-x-0  z-50' : (isRtl ? 'translate-x-full' : '-translate-x-full')
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xl font-semibold text-gray-800 dark:text-white font-cairo">
            {t('common.admin.dashboard')}
          </div>
          <button 
            className="p-1 rounded-md lg:hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={toggleSidebar}
          >
            <FiX className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="mt-5 px-4 overflow-y-auto flex-1">
          <AdminSidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="w-full h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <button
              className="p-1 rounded-md lg:hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={toggleSidebar}
            >
              <FiMenu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
              {t('common.admin.adminPanel')}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto  p-6 bg-gray-100 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
