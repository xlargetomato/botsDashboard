'use client';

import { useState, useEffect } from 'react';
import { FiEye, FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiRefreshCw, FiUser, FiCreditCard, FiCalendar, FiHash } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useTranslation } from '@/lib/i18n/config';

export default function PaymentsManagement() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);
  
  // Function to handle refresh button click
  const handleRefresh = () => {
    fetchPayments();
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/payments');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: Failed to fetch payments`);
      }
      
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError(error.message);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterStatus = (e) => {
    setFilterStatus(e.target.value);
  };

  const handleFilterMethod = (e) => {
    setFilterMethod(e.target.value);
  };

  const handleViewDetails = (payment) => {
    setCurrentPayment(payment);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setCurrentPayment(null);
  };

  // Apply filters and sorting to payments data
  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = 
      (payment.userName || payment.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (payment.userEmail || payment.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.transactionId || payment.transaction_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    
    // Payment method filter
    const matchesMethod = filterMethod === 'all' || 
      (payment.paymentMethod || payment.payment_method || '').toLowerCase() === filterMethod.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Sort payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortField === 'amount') {
      return sortDirection === 'asc' 
        ? a.amount - b.amount 
        : b.amount - a.amount;
    } else if (sortField === 'createdAt' || sortField === 'created_at') {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return sortDirection === 'asc'
        ? dateA - dateB
        : dateB - dateA;
    } else if (sortField === 'userName' || sortField === 'user_name') {
      const nameA = (a.userName || a.user_name || '').toLowerCase();
      const nameB = (b.userName || b.user_name || '').toLowerCase();
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else if (sortField === 'planName' || sortField === 'plan_name') {
      const planA = (a.planName || a.plan_name || '').toLowerCase();
      const planB = (b.planName || b.plan_name || '').toLowerCase();
      return sortDirection === 'asc'
        ? planA.localeCompare(planB)
        : planB.localeCompare(planA);
    } else if (sortField === 'transactionId' || sortField === 'transaction_id') {
      const idA = (a.transactionId || a.transaction_id || '').toLowerCase();
      const idB = (b.transactionId || b.transaction_id || '').toLowerCase();
      return sortDirection === 'asc'
        ? idA.localeCompare(idB)
        : idB.localeCompare(idA);
    } else if (sortField === 'status') {
      const statusA = (a.status || '').toLowerCase();
      const statusB = (b.status || '').toLowerCase();
      return sortDirection === 'asc'
        ? statusA.localeCompare(statusB)
        : statusB.localeCompare(statusA);
    } else if (sortField === 'paymentMethod' || sortField === 'payment_method') {
      const methodA = (a.paymentMethod || a.payment_method || '').toLowerCase();
      const methodB = (b.paymentMethod || b.payment_method || '').toLowerCase();
      return sortDirection === 'asc'
        ? methodA.localeCompare(methodB)
        : methodB.localeCompare(methodA);
    }
    return 0;
  });

  // Format currency
  const formatCurrency = (amount, currency = 'SAR') => {
    return new Intl.NumberFormat(isRtl ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white">
            {isRtl ? 'إدارة المدفوعات' : 'Payments Management'}
          </h1>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={isRtl ? 'تحديث البيانات' : 'Refresh data'}
            disabled={loading}
          >
            <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Filters and Search */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex flex-col space-y-3">
            {/* Search input */}
            <div className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pr-3">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={isRtl ? 'البحث عن طريق الاسم أو البريد الإلكتروني أو رقم المعاملة' : 'Search by name, email, or transaction ID'}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
            
            {/* Filter buttons - Mobile friendly */}
            <div className="flex flex-wrap gap-2">
              {/* Status filter - Card style for mobile */}
              <div className="w-full md:w-auto">
                <div className="relative">
                  <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <FiFilter className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4 text-indigo-500 dark:text-indigo-400`} />
                    <select
                      className="appearance-none bg-transparent border-none w-full py-1 pr-7 pl-2 focus:outline-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200"
                      value={filterStatus}
                      onChange={handleFilterStatus}
                    >
                      <option value="all" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                      <option value="completed" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'مكتمل' : 'Completed'}</option>
                      <option value="pending" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'قيد الانتظار' : 'Pending'}</option>
                      <option value="failed" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'فشل' : 'Failed'}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 rtl:right-auto rtl:left-0 rtl:pl-2 rtl:pr-0">
                      <FiChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Method filter - Card style for mobile */}
              <div className="w-full md:w-auto">
                <div className="relative">
                  <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <FiCreditCard className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4 text-indigo-500 dark:text-indigo-400`} />
                    <select
                      className="appearance-none bg-transparent border-none w-full py-1 pr-7 pl-2 focus:outline-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200"
                      value={filterMethod}
                      onChange={handleFilterMethod}
                    >
                      <option value="all" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'جميع الطرق' : 'All Methods'}</option>
                      <option value="credit_card" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'بطاقة ائتمان' : 'Credit Card'}</option>
                      <option value="bank_transfer" className={isRtl ? 'font-cairo' : ''}>{isRtl ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                      <option value="paypal">PayPal</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 rtl:right-auto rtl:left-0 rtl:pl-2 rtl:pr-0">
                      <FiChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium font-cairo">{isRtl ? 'خطأ' : 'Error'}</p>
                <p className="mt-1 text-sm">{error}</p>
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
        )}
        
        {/* Payments Table */}
        {/* Payments Table/Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {payments.length === 0 && !loading && !error ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl ? 'لا توجد مدفوعات للعرض' : 'No payments to display'}
              </p>
            </div>
          ) : loading && payments.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-300 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{isRtl ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : (
            <div>
              {/* Mobile view - Card layout */}
              <div className="block sm:hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedPayments.map((payment) => (
                    <div key={payment.id} className="p-4 mb-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Status Badge - Prominently displayed at the top */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isRtl ? 'font-cairo' : ''} ${
                            payment.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            <span className="capitalize">{payment.status || '-'}</span>
                          </span>
                        </div>
                        <span className={`text-sm font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                          {formatDate(payment.createdAt || payment.created_at)}  
                        </span>
                      </div>
                      
                      {/* Customer Information */}
                      <div className="flex items-start mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className={`${isRtl ? 'ml-3' : 'mr-3'} mt-1`}>
                          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <FiUser className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold text-gray-900 dark:text-white ${isRtl ? 'font-cairo' : ''}`}>
                            {payment.userName || payment.user_name || '-'}
                          </p>
                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                            {payment.userEmail || payment.user_email || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Payment Details in Card Layout */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Amount */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <div className="flex items-center mb-1">
                            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-2">
                              <FiCreditCard className="h-3 w-3 text-green-600 dark:text-green-300" />
                            </div>
                            <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                              {isRtl ? 'المبلغ' : 'Amount'}
                            </span>
                          </div>
                          <p className={`text-base font-bold text-gray-900 dark:text-white ${isRtl ? 'font-cairo text-right' : ''}`}>
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                        </div>
                        
                        {/* Plan */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <div className="flex items-center mb-1">
                            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2">
                              <FiCreditCard className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                            </div>
                            <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                              {isRtl ? 'الخطة' : 'Plan'}
                            </span>
                          </div>
                          <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${isRtl ? 'font-cairo text-right' : ''}`}>
                            {payment.planName || payment.plan_name || '-'}
                          </p>
                        </div>
                        
                        {/* Payment Method */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <div className="flex items-center mb-1">
                            <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-2">
                              <FiCreditCard className="h-3 w-3 text-purple-600 dark:text-purple-300" />
                            </div>
                            <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                              {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                            </span>
                          </div>
                          <p className={`text-sm font-medium text-gray-900 dark:text-white capitalize ${isRtl ? 'font-cairo text-right' : ''}`}>
                            {(payment.paymentMethod || payment.payment_method || '-').replace('_', ' ')}
                          </p>
                        </div>
                        
                        {/* Transaction ID */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <div className="flex items-center mb-1">
                            <div className="h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mr-2">
                              <FiHash className="h-3 w-3 text-yellow-600 dark:text-yellow-300" />
                            </div>
                            <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                              {isRtl ? 'رقم المعاملة' : 'Transaction ID'}
                            </span>
                          </div>
                          <p className={`text-xs font-medium text-gray-900 dark:text-white truncate ${isRtl ? 'font-cairo text-right' : ''}`}>
                            {payment.transactionId || payment.transaction_id || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* View Details Button */}
                      <div className="mt-3 flex justify-center">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                          <FiEye className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                          <span className={`${isRtl ? 'font-cairo' : ''}`}>{isRtl ? 'عرض التفاصيل' : 'View Details'}</span>
                        </button>
                      </div>
            </div>
          ))}
        </div>
      </div>
      
              {/* Desktop view - Table layout */}
              <div className="hidden sm:block overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center items-center p-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 dark:border-gray-300"></div>
                    </div>
                  ) : (
                    sortedPayments.map((payment) => (
                      <div key={payment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {payment.userName || payment.user_name || '-'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {payment.userEmail || payment.user_email || '-'}
                            </p>
                          </div>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            <span className="capitalize">{payment.status || '-'}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? 'الخطة' : 'Plan'}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{payment.planName || payment.plan_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? 'المبلغ' : 'Amount'}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(payment.amount, payment.currency)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</p>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">
                              {(payment.paymentMethod || payment.payment_method || '-').replace('_', ' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? 'التاريخ' : 'Date'}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(payment.createdAt || payment.created_at)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleViewDetails(payment)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <FiEye className="mr-1" />
                            {isRtl ? 'عرض التفاصيل' : 'View Details'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          }
          {/* Desktop view - Table layout */}
              <div className="hidden sm:block">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('transactionId')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'رقم المعاملة' : 'Transaction ID'}</span>
                        {sortField === 'transactionId' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('userName')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'العميل' : 'Customer'}</span>
                        {sortField === 'userName' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('planName')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'الخطة' : 'Plan'}</span>
                        {sortField === 'planName' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'المبلغ' : 'Amount'}</span>
                        {sortField === 'amount' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('paymentMethod')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</span>
                        {sortField === 'paymentMethod' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'الحالة' : 'Status'}</span>
                        {sortField === 'status' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        <span className="font-cairo">{isRtl ? 'التاريخ' : 'Date'}</span>
                        {sortField === 'createdAt' && (
                          <span className={`${isRtl ? 'mr-1' : 'ml-1'}`}>
                            {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <span className="font-cairo">{isRtl ? 'الإجراءات' : 'Actions'}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 dark:border-gray-300"></div>
                        </div>
                      </td>
                    </tr>
                  ) : sortedPayments.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-cairo">{isRtl ? 'لا توجد مدفوعات مطابقة للبحث' : 'No matching payments found'}</span>
                      </td>
                    </tr>
                  ) : (
                    sortedPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {payment.transactionId || payment.transaction_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className={`text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'font-cairo' : ''}`}>
                                {payment.userName || payment.user_name || '-'}
                              </div>
                              <div className={`text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                                {payment.userEmail || payment.user_email || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <span className={`${isRtl ? 'font-cairo' : ''}`}>{payment.planName || payment.plan_name || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <span className={`${isRtl ? 'font-cairo' : ''}`}>{formatCurrency(payment.amount, payment.currency)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <span className={`capitalize ${isRtl ? 'font-cairo' : ''}`}>
                            {(payment.paymentMethod || payment.payment_method || '-').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            (payment.status === 'completed') 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : (payment.status === 'pending')
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : (payment.status === 'failed')
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            <span className="capitalize">{payment.status || '-'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(payment.createdAt || payment.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleViewDetails(payment)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              title={isRtl ? 'عرض التفاصيل' : 'View Details'}
                            >
                              <FiEye className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && currentPayment && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white font-cairo">
                      {isRtl ? 'تفاصيل الدفع' : 'Payment Details'}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'رقم المعاملة' : 'Transaction ID'}</p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{currentPayment.transactionId || currentPayment.transaction_id || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'التاريخ' : 'Date'}</p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(currentPayment.createdAt || currentPayment.created_at)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'العميل' : 'Customer'}</p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {(currentPayment.userName || currentPayment.user_name || '-')} 
                          ({currentPayment.userEmail || currentPayment.user_email || '-'})
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'الخطة' : 'Plan'}</p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{currentPayment.planName || currentPayment.plan_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'المبلغ' : 'Amount'}</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(currentPayment.amount, currentPayment.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                            {(currentPayment.paymentMethod || currentPayment.payment_method || '-').replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'الحالة' : 'Status'}</p>
                          <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              currentPayment.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : currentPayment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : currentPayment.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              <span className="capitalize">{currentPayment.status || '-'}</span>
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseModal}
                >
                  <span className="font-cairo">{isRtl ? 'إغلاق' : 'Close'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
