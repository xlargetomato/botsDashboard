'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import AdminLayout from '@/components/layouts/AdminLayout';
import { FiLayers, FiSearch, FiFilter, FiDownload, FiCheck, FiX, FiAlertCircle, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export default function AdminSubscriptionsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const locale = isRtl ? ar : enUS;
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  useEffect(() => {
    fetchSubscriptions();
  }, []);
  
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      // Fetch all subscriptions from the database
      const response = await fetch('/api/admin/subscriptions', {
        headers: {
          'x-admin-access': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      
      const data = await response.json();
      
      // Ensure we have an array of subscriptions
      if (!Array.isArray(data)) {
        console.warn('API did not return an array, using empty array instead');
        setSubscriptions([]);
      } else {
        console.log(`Fetched ${data.length} subscriptions from API`);
        setSubscriptions(data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'available':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'expired':
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <FiCheck className="inline-block mr-1" />;
      case 'available':
      case 'pending':
        return <FiClock className="inline-block mr-1" />;
      case 'expired':
      case 'cancelled':
      case 'canceled':
        return <FiX className="inline-block mr-1" />;
      default:
        return null;
    }
  };
  
  const getSubscriptionType = (type) => {
    switch (type?.toLowerCase()) {
      case 'weekly':
        return isRtl ? 'أسبوعي' : 'Weekly';
      case 'monthly':
        return isRtl ? 'شهري' : 'Monthly';
      case 'yearly':
        return isRtl ? 'سنوي' : 'Yearly';
      default:
        return type || '-';
    }
  };
  
  const getRemainingDays = (endDate) => {
    if (!endDate) return '-';
    
    try {
      const end = new Date(endDate);
      const today = new Date();
      const days = differenceInDays(end, today);
      
      if (days < 0) return isRtl ? 'منتهي' : 'Expired';
      return isRtl ? `${days} يوم` : `${days} days`;
    } catch (err) {
      console.error('Error calculating remaining days:', err);
      return '-';
    }
  };
  
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = 
      (subscription.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       subscription.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       subscription.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       subscription.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()));
       
    const matchesStatus = 
      statusFilter === 'all' || 
      subscription.status?.toLowerCase() === statusFilter;
      
    const matchesType = 
      typeFilter === 'all' || 
      subscription.subscription_type?.toLowerCase() === typeFilter;
      
    return matchesSearch && matchesStatus && matchesType;
  });
  
  const exportToCSV = () => {
    const headers = ['ID', 'User', 'Email', 'Plan', 'Type', 'Start Date', 'End Date', 'Remaining', 'Status'];
    const csvData = filteredSubscriptions.map(s => [
      s.id,
      s.user_name,
      s.user_email,
      s.plan_name,
      s.subscription_type,
      s.start_date,
      s.end_date,
      getRemainingDays(s.end_date),
      s.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleRefresh = () => {
    fetchSubscriptions();
  };
  
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <FiLayers className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'إدارة الاشتراكات' : 'Subscriptions Management'}
            </h1>
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button 
              onClick={handleRefresh}
              className="p-2 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title={isRtl ? 'تحديث البيانات' : 'Refresh data'}
              disabled={loading}
            >
              <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <FiDownload className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              <span className="font-cairo">{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
        
        <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">
          {isRtl ? 'عرض وإدارة جميع اشتراكات المستخدمين في النظام' : 'View and manage all user subscriptions in the system'}
        </p>
        
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className={`block w-full ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-cairo`}
              placeholder={isRtl ? "البحث عن اشتراك..." : "Search subscriptions..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <FiFilter className={`h-5 w-5 text-gray-400 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-cairo"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="active">{isRtl ? 'نشط' : 'Active'}</option>
                <option value="available">{isRtl ? 'متاح' : 'Available'}</option>
                <option value="expired">{isRtl ? 'منتهي' : 'Expired'}</option>
                <option value="cancelled">{isRtl ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-cairo"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <option value="all">{isRtl ? 'جميع الأنواع' : 'All Types'}</option>
                <option value="weekly">{isRtl ? 'أسبوعي' : 'Weekly'}</option>
                <option value="monthly">{isRtl ? 'شهري' : 'Monthly'}</option>
                <option value="yearly">{isRtl ? 'سنوي' : 'Yearly'}</option>
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{isRtl ? 'جارِ التحميل...' : 'Loading...'}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{isRtl ? 'خطأ' : 'Error'}</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-700 text-xs font-medium rounded-md shadow-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={loading}
              >
                <FiRefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                {isRtl ? 'إعادة المحاولة' : 'Try Again'}
              </button>
            </div>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              {isRtl ? 'لا توجد اشتراكات متطابقة مع معايير البحث' : 'No subscriptions matching your search criteria'}
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              <div className="space-y-4">
                {filteredSubscriptions.map((subscription, index) => (
                  <div key={subscription.id || index} 
                       className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 dark:border-gray-700">
                    
                    {/* Status Badge & Remaining Days */}
                    <div className="flex justify-between items-center mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        <span className="font-cairo">{subscription.status || 'Unknown'}</span>
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                        {getRemainingDays(subscription.end_date)}
                      </span>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex items-start mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className={`${isRtl ? 'ml-3' : 'mr-3'} mt-1`}>
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-300">
                            {(subscription.user_name || '-').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold text-gray-900 dark:text-white ${isRtl ? 'font-cairo' : ''}`}>
                          {subscription.user_name || '-'}
                        </p>
                        <p className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                          {subscription.user_email || '-'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Subscription Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Plan */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2">
                            <FiLayers className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                          </div>
                          <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                            {isRtl ? 'الخطة' : 'Plan'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'font-cairo text-right' : ''}`}>
                          {subscription.plan_name || '-'}
                        </p>
                      </div>
                      
                      {/* Subscription Type */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-2">
                            <FiClock className="h-3 w-3 text-purple-600 dark:text-purple-300" />
                          </div>
                          <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                            {isRtl ? 'نوع الاشتراك' : 'Type'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium text-gray-900 dark:text-white capitalize ${isRtl ? 'font-cairo text-right' : ''}`}>
                          {getSubscriptionType(subscription.subscription_type)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Start Date */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-2">
                            <FiClock className="h-3 w-3 text-green-600 dark:text-green-300" />
                          </div>
                          <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                            {isRtl ? 'تاريخ البداية' : 'Start Date'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'font-cairo text-right' : ''}`}>
                          {subscription.start_date 
                            ? format(new Date(subscription.start_date), 'PP', { locale })
                            : '-'}
                        </p>
                      </div>
                      
                      {/* End Date */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-2">
                            <FiClock className="h-3 w-3 text-red-600 dark:text-red-300" />
                          </div>
                          <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                            {isRtl ? 'تاريخ الانتهاء' : 'End Date'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'font-cairo text-right' : ''}`}>
                          {subscription.end_date 
                            ? format(new Date(subscription.end_date), 'PP', { locale })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'المستخدم' : 'User'}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'خطة الاشتراك' : 'Subscription Plan'}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'النوع' : 'Type'}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'تاريخ البدء' : 'Start Date'}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'تاريخ الانتهاء' : 'End Date'}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'المتبقي' : 'Remaining'}
                  </th>
                  <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo`}>
                    {isRtl ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredSubscriptions.map((subscription, index) => (
                  <tr key={subscription.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <FiUser className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className={`${isRtl ? 'mr-4' : 'ml-4'}`}>
                          <div className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                            {subscription.user_name || '-'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
                            {subscription.user_email || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {subscription.plan_name || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {getSubscriptionType(subscription.subscription_type)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {subscription.start_date 
                        ? format(new Date(subscription.start_date), 'PP', { locale })
                        : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {subscription.end_date 
                        ? format(new Date(subscription.end_date), 'PP', { locale })
                        : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {getRemainingDays(subscription.end_date)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRtl ? 'text-right' : 'text-left'}`}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(subscription.status)} font-cairo`}>
                        {getStatusIcon(subscription.status)}
                        {subscription.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
