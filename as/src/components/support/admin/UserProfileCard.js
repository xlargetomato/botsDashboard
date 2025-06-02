'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import { FiUser, FiMail, FiCalendar, FiCreditCard, FiPackage, FiDollarSign, FiClock, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

export default function UserProfileCard({ user, isRtl }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getSubscriptionStatus = (status) => {
    if (!status) return { text: '-', className: 'text-gray-500' };
    
    switch(status.toLowerCase()) {
      case 'active':
        return { 
          text: isRtl ? 'نشط' : 'Active', 
          className: 'text-green-600 dark:text-green-400'
        };
      case 'expired':
        return { 
          text: isRtl ? 'منتهي' : 'Expired', 
          className: 'text-red-600 dark:text-red-400'
        };
      case 'pending':
        return { 
          text: isRtl ? 'معلق' : 'Pending', 
          className: 'text-yellow-600 dark:text-yellow-400'
        };
      default:
        return { 
          text: status, 
          className: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header with basic info */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              <div className="relative h-12 w-12">
                <Image 
                  src={user.avatar} 
                  alt={user.name || 'User'} 
                  fill
                  sizes="48px"
                  className="object-cover" 
                />
              </div>
            ) : (
              <FiUser className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <div className={`${isRtl ? 'mr-3 text-right' : 'ml-3 text-left'}`}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white font-cairo">
              {user.name || 'Unknown User'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo flex items-center">
              <FiMail className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
              {user.email || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Basic info always visible */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'تاريخ التسجيل' : 'Registered'}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo flex items-center">
              <FiCalendar className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
              {formatDate(user.created_at)}
            </p>
          </div>
          <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'عدد التذاكر' : 'Tickets'}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
              {user.ticket_count || '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <span className="text-sm font-medium font-cairo mr-1">
          {expanded 
            ? (isRtl ? 'عرض معلومات أقل' : 'Show less') 
            : (isRtl ? 'عرض المزيد من المعلومات' : 'Show more details')}
        </span>
        {expanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Subscription info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'معلومات الاشتراك' : 'Subscription Information'}
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'خطة الاشتراك' : 'Plan'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo flex items-center">
                    <FiPackage className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                    {user.subscription?.plan_name || '-'}
                  </p>
                </div>
                <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'الحالة' : 'Status'}</p>
                  <p className={`text-sm font-medium font-cairo ${getSubscriptionStatus(user.subscription?.status).className}`}>
                    {getSubscriptionStatus(user.subscription?.status).text}
                  </p>
                </div>
                <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'تاريخ البدء' : 'Start Date'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                    {formatDate(user.subscription?.start_date)}
                  </p>
                </div>
                <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'تاريخ الانتهاء' : 'End Date'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                    {formatDate(user.subscription?.end_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment history summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'ملخص المدفوعات' : 'Payment Summary'}
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo flex items-center">
                    <FiDollarSign className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                    {user.payment_total ? `${user.payment_total} SAR` : '-'}
                  </p>
                </div>
                <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'آخر دفعة' : 'Last Payment'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo flex items-center">
                    <FiClock className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                    {formatDate(user.last_payment_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-2">
            <Link 
              href={`/dashboard/admin/users?search=${user.email}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-cairo"
            >
              {isRtl ? 'عرض الملف الشخصي الكامل' : 'View Full Profile'}
            </Link>
            <Link 
              href={`/dashboard/admin/subscriptions?search=${user.email}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-cairo"
            >
              {isRtl ? 'عرض الاشتراكات' : 'View Subscriptions'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
