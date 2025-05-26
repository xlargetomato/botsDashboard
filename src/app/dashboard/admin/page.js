'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiCreditCard, FiTag, FiBarChart2, FiMessageSquare, FiPackage } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useTranslation } from '@/lib/i18n/config';
import Link from 'next/link';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    activeCoupons: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: t('common.admin.totalUsers'),
      value: stats.totalUsers,
      icon: FiUsers,
      color: 'bg-blue-500',
    },
    {
      title: t('common.admin.activeUsers'),
      value: stats.activeSubscriptions,
      icon: FiCreditCard,
      color: 'bg-green-500',
    },
    {
      title: t('common.admin.totalRevenue'),
      value: `$${typeof stats.totalRevenue === 'number' ? stats.totalRevenue.toFixed(2) : '0.00'}`,
      icon: FiBarChart2,
      color: 'bg-purple-500',
    },
    {
      title: t('common.admin.activeCoupons'),
      value: stats.activeCoupons,
      icon: FiTag,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 font-cairo">
          {t('common.admin.dashboard')}
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${card.color} text-white ${isRtl ? 'ml-4' : 'mr-4'}`}>
                      <card.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">
                        {card.title}
                      </p>
                      <p className="text-2xl font-semibold text-gray-800 dark:text-white font-cairo">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 font-cairo">
              {t('common.admin.recentActivities')}
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 font-cairo">
                {t('common.admin.activitiesDescription')}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 font-cairo">
              {t('common.admin.quickActions')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link
                href="/dashboard/admin/subscription-plans"
                className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
              >
                <FiPackage className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mb-2" />
                <span className="text-sm text-center font-medium text-gray-700 dark:text-gray-300 font-cairo">
                  {isRtl ? 'خطط الاشتراك' : 'Subscription Plans'}
                </span>
              </Link>
              <Link
                href="/dashboard/admin/users"
                className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
              >
                <FiUsers className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mb-2" />
                <span className="text-sm text-center font-medium text-gray-700 dark:text-gray-300 font-cairo">
                  {t('common.admin.manageUsers')}
                </span>
              </Link>
              <Link
                href="/dashboard/admin/support"
                className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
              >
                <FiMessageSquare className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mb-2" />
                <span className="text-sm text-center font-medium text-gray-700 dark:text-gray-300 font-cairo">
                  {isRtl ? 'الدعم الفني' : 'Support'}
                </span>
              </Link>
              <Link
                href="/dashboard/admin/payments"
                className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
              >
                <FiCreditCard className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mb-2" />
                <span className="text-sm text-center font-medium text-gray-700 dark:text-gray-300 font-cairo">
                  {t('common.admin.viewPayments')}
                </span>
              </Link>
              <Link
                href="/dashboard/admin/coupons"
                className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
              >
                <FiTag className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mb-2" />
                <span className="text-sm text-center font-medium text-gray-700 dark:text-gray-300 font-cairo">
                  {t('common.admin.manageCoupons')}
                </span>
              </Link>
              <Link
                href="/dashboard/admin/statistics"
                className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
              >
                <FiBarChart2 className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mb-2" />
                <span className="text-sm text-center font-medium text-gray-700 dark:text-gray-300 font-cairo">
                  {t('common.admin.viewStatistics')}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
