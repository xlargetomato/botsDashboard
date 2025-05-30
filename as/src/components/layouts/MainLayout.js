'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import { FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '@/lib/auth/AuthContext';

export default function MainLayout({ children, sidebar, className }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isRtl = i18n.language === 'ar';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [children]);

  return (
    <div className={`flex flex-col h-screen bg-gray-100 dark:bg-gray-900 ${isRtl ? 'rtl' : 'ltr'} ${className || ''} overflow-hidden`}>
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-30 w-64 transform bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 flex flex-col ${
            isMobileMenuOpen ? 'translate-x-0 z-50' : (isRtl ? 'translate-x-full' : '-translate-x-full')
          }`}
        >
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="text-xl font-semibold text-gray-800 dark:text-white font-cairo">
              {isRtl ? 'لوحة التحكم' : 'Dashboard'}
            </div>
            <button 
              className="p-1 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiX className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {sidebar}
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top navbar */}
          <header className="w-full h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center">
              <button
                className="p-1 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <FiMenu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                {isRtl ? 'لوحة تحكم العميل' : 'Client Dashboard'}
              </span>
            </div>
          </header>
          
          {/* Page content */}
          <main className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-gray-900">
            <div className="max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
