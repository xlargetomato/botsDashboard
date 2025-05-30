'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import { FiUsers, FiCreditCard, FiBarChart2, FiMenu, FiX, FiMessageSquare, FiHelpCircle } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

export default function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Import useTranslation hook
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Client menu items
  const navItems = [
    { name: isRtl ? 'لوحة التحكم' : 'Dashboard', href: '/dashboard/client', icon: FiBarChart2, exact: true },
    { name: isRtl ? 'البوتات' : 'Bots', href: '/dashboard/client/bots', icon: RiRobot2Line },
    { name: isRtl ? 'اشتراكاتي' : 'My Subscriptions', href: '/dashboard/client/subscriptions', icon: FiCreditCard },
    { name: isRtl ? 'حسابي' : 'My Account', href: '/dashboard/client/account', icon: FiUsers },
    { name: isRtl ? 'مساعدة' : 'Help', href: '/dashboard/client/help', icon: FiHelpCircle },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="space-y-6">
      
      <nav className="space-y-1">
        {navItems.map((item) => {
          // For the Dashboard item, only mark as active if the path is exactly '/dashboard/client'
          // For other items, use the normal startsWith check
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
            
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className={`${isRtl ? 'ml-3' : 'mr-3'} h-5 w-5 ${
                isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className="font-cairo">{item.name}</span>
              {isActive && (
                <span className={`${isRtl ? 'mr-auto' : 'ml-auto'} h-2 w-2 rounded-full bg-indigo-500`}></span>
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-3' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-cairo">{isRtl ? 'تسجيل الخروج' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );
}