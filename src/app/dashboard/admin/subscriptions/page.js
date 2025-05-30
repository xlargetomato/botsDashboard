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
        return <FiCheck className={`inline-block ${isRtl ? 'ml-1' : 'mr-1'}`} />;
      case 'available':
      case 'pending':
        return <FiClock className={`inline-block ${isRtl ? 'ml-1' : 'mr-1'}`} />;
      case 'expired':
      case 'cancelled':
      case 'canceled':
        return <FiX className={`inline-block ${isRtl ? 'ml-1' : 'mr-1'}`} />;
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
      <div className="p-4 sm:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-4 sm:mb-6">
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div className="relative flex">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={isRtl ? 'بحث...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${isRtl ? 'pr-10' : 'pl-10'} w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-cairo dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            />
          </div>
          
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleRefresh}
              className={`flex items-center justify-center py-2 px-3 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none ${isRtl ? 'ml-2' : 'mr-2'}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className={`animate-spin ${isRtl ? '-mr-1 ml-2' : '-ml-1 mr-2'} h-4 w-4 text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
                </span>
              ) : (
                <span className="flex items-center">
                  <FiRefreshCw className={`${isRtl ? 'ml-2' : 'mr-2'}`} />
                  {isRtl ? 'تحديث' : 'Refresh'}
                </span>
              )}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center py-2 px-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
              disabled={filteredSubscriptions.length === 0}
            >
              <FiDownload className={`${isRtl ? 'ml-2' : 'mr-2'}`} />
              {isRtl ? 'تصدير CSV' : 'Export CSV'}
            </button>
          </div>
        </div>
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md p-4 my-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className={`${isRtl ? 'mr-3' : 'ml-3'}`}>  
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 font-cairo">
                  {isRtl ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading data'}
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && !error && filteredSubscriptions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <FiX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'لا توجد اشتراكات' : 'No subscriptions found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-cairo">
              {isRtl 
                ? 'لم يتم العثور على أي اشتراكات تطابق معايير البحث الخاصة بك.' 
                : 'No subscriptions were found matching your search criteria.'}
            </p>
          </div>
        )}
        
        {/* Data display - Responsive for mobile and desktop */}
        {!loading && !error && filteredSubscriptions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-lg">
            {/* Mobile card view */}
            <div className="md:hidden">
              <div className="space-y-4 p-4">
                {filteredSubscriptions.map((subscription, index) => (
                  <div key={subscription.id || index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                    {/* Header: User & Status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start">
                        <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className={`${isRtl ? 'mr-3' : 'ml-3'}`}>
                          <div className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                            {subscription.user_name || '-'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                            {subscription.user_email || '-'}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(subscription.status)} font-cairo`}>
                        {getStatusIcon(subscription.status)}
                        {subscription.status || 'Unknown'}
                      </span>
                    </div>
                    
                    {/* Plan & Type */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                          {isRtl ? 'خطة الاشتراك' : 'Plan'}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                          {subscription.plan_name || '-'}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                          {isRtl ? 'نوع الاشتراك' : 'Type'}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                          {getSubscriptionType(subscription.subscription_type)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                          {isRtl ? 'تاريخ البدء' : 'Start Date'}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                          {subscription.start_date 
                            ? format(new Date(subscription.start_date), 'PP', { locale })
                            : '-'}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                          {isRtl ? 'تاريخ الانتهاء' : 'End Date'}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-cairo">
                          {subscription.end_date 
                            ? format(new Date(subscription.end_date), 'PP', { locale })
                            : '-'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Remaining Time */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                          {isRtl ? 'المتبقي:' : 'Remaining:'}
                        </p>
                        <p className="text-sm font-bold text-purple-700 dark:text-purple-300 font-cairo">
                          {getRemainingDays(subscription.end_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Desktop table view */}
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
