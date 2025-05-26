'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import { FiUsers, FiCreditCard, FiBarChart2, FiMenu, FiX, FiMessageSquare, FiHelpCircle, FiPackage, FiGlobe, FiTag, FiPieChart, FiLifeBuoy, FiFileText, FiDollarSign, FiLayers, FiCpu, FiChevronDown, FiChevronUp, FiSettings, FiShoppingCart } from 'react-icons/fi';

export default function AdminSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Import useTranslation hook
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Track open sections
  const [openSections, setOpenSections] = useState({});

  // Admin menu sections with their items
  const navSections = [
    {
      id: 'main',
      title: isRtl ? 'الرئيسية' : 'Main',
      icon: FiBarChart2,
      items: [
        { name: isRtl ? 'لوحة التحكم' : 'Dashboard', href: '/dashboard/admin', icon: FiBarChart2, exact: true },
        { name: isRtl ? 'الإحصائيات' : 'Statistics', href: '/dashboard/admin/statistics', icon: FiPieChart },
      ]
    },
    {
      id: 'users',
      title: isRtl ? 'المستخدمين' : 'Users',
      icon: FiUsers,
      items: [
        { name: isRtl ? 'المستخدمين' : 'Users', href: '/dashboard/admin/users', icon: FiUsers },
      ]
    },
    {
      id: 'subscriptions',
      title: isRtl ? 'الاشتراكات والمدفوعات' : 'Subscriptions & Payments',
      icon: FiCreditCard,
      items: [
        { name: isRtl ? 'خطط الاشتراك' : 'Subscription Plans', href: '/dashboard/admin/subscription-plans', icon: FiPackage },
        { name: isRtl ? 'الاشتراكات' : 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: FiLayers },
        { name: isRtl ? 'المدفوعات' : 'Payments', href: '/dashboard/admin/payments', icon: FiCreditCard },
        { name: isRtl ? 'المعاملات' : 'Transactions', href: '/dashboard/admin/transactions', icon: FiDollarSign },
        { name: isRtl ? 'الكوبونات' : 'Coupons', href: '/dashboard/admin/coupons', icon: FiTag },
      ]
    },
    {
      id: 'services',
      title: isRtl ? 'الخدمات' : 'Services',
      icon: FiSettings,
      items: [
        { name: isRtl ? 'الروبوتات' : 'Bots', href: '/dashboard/admin/bots', icon: FiCpu },
      ]
    },
    {
      id: 'support',
      title: isRtl ? 'الدعم والمساعدة' : 'Support & Help',
      icon: FiLifeBuoy,
      items: [
        { name: isRtl ? 'الدعم' : 'Support', href: '/dashboard/admin/support', icon: FiLifeBuoy },
        { name: isRtl ? 'الأسئلة الشائعة' : 'FAQs', href: '/dashboard/admin/faqs', icon: FiFileText },
      ]
    },
  ];

  // Auto-open section containing the active route
  useEffect(() => {
    navSections.forEach(section => {
      const hasActiveItem = section.items.some(item => {
        return item.exact 
          ? pathname === item.href 
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
      });
      
      if (hasActiveItem) {
        setOpenSections(prev => ({ ...prev, [section.id]: true }));
      }
    });
  }, [pathname]);

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="space-y-4">
      
      <nav className="space-y-2">
        {navSections.map((section) => {
          const isSectionOpen = openSections[section.id];
          const hasActiveItem = section.items.some(item => {
            return item.exact 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          });
          
          return (
            <div key={section.id} className="space-y-1">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${hasActiveItem ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <div className="flex items-center">
                  <section.icon className={`${isRtl ? 'ml-2' : 'mr-2'} h-5 w-5 ${hasActiveItem ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className="font-cairo font-semibold">{section.title}</span>
                </div>
                {isSectionOpen ? 
                  <FiChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" /> : 
                  <FiChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                }
              </button>
              
              {/* Section items */}
              {isSectionOpen && (
                <div className={`${isRtl ? 'pr-4' : 'pl-4'} space-y-1 py-1`}>
                  {section.items.map((item) => {
                    const isActive = item.exact 
                      ? pathname === item.href 
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    
                    return (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' 
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                      >
                        <item.icon className={`${isRtl ? 'ml-3' : 'mr-3'} h-5 w-5 ${isActive ? 'text-purple-500 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className="font-cairo">{item.name}</span>
                        {isActive && (
                          <span className={`${isRtl ? 'mr-auto' : 'ml-auto'} h-2 w-2 rounded-full bg-purple-500`}></span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/dashboard/client"
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-3' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-cairo">{isRtl ? 'العودة إلى لوحة العميل' : 'Back to Client Dashboard'}</span>
        </Link>
        
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}
          className="flex items-center w-full px-4 py-2.5 mt-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
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
