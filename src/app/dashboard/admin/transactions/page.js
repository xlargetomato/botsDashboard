'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import AdminLayout from '@/components/layouts/AdminLayout';
import { FiDollarSign, FiSearch, FiFilter, FiDownload, FiCheck, FiX, FiAlertCircle, FiCreditCard } from 'react-icons/fi';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export default function AdminTransactionsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const locale = isRtl ? ar : enUS;
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    fetchTransactions();
  }, []);
  
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch all payment transactions from the database
      const response = await fetch('/api/admin/payments', {
        headers: {
          'x-admin-access': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      
      // Ensure we have an array of transactions
      if (!Array.isArray(data)) {
        console.warn('API did not return an array, using empty array instead');
        setTransactions([]);
      } else {
        console.log(`Fetched ${data.length} transactions from API`);
        setTransactions(data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'successful':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed':
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'successful':
        return <FiCheck className="inline-block mr-1" />;
      case 'pending':
      case 'processing':
        return <FiAlertCircle className="inline-block mr-1" />;
      case 'failed':
      case 'cancelled':
      case 'canceled':
        return <FiX className="inline-block mr-1" />;
      default:
        return null;
    }
  };
  
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      (transaction.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       transaction.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       transaction.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       transaction.amount?.toString().includes(searchTerm));
       
    const matchesStatus = 
      statusFilter === 'all' || 
      transaction.status?.toLowerCase() === statusFilter;
      
    return matchesSearch && matchesStatus;
  });
  
  const exportToCSV = () => {
    const headers = ['Transaction ID', 'Date', 'User', 'Email', 'Amount', 'Method', 'Status'];
    const csvData = filteredTransactions.map(t => [
      t.transactionId || t.id,
      t.date || t.createdAt,
      t.userName,
      t.userEmail,
      `${t.amount} ${t.currency || 'SAR'}`,
      t.paymentMethod || t.method,
      t.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <AdminLayout>
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiDollarSign className={`h-6 w-6 text-purple-600 dark:text-purple-400 ${isRtl ? 'ml-3' : 'mr-3'}`} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'المعاملات' : 'Transactions'}
            </h1>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <FiDownload className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            <span className="font-cairo">{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isRtl ? 'عرض وإدارة جميع المعاملات المالية في النظام' : 'View and manage all financial transactions in the system'}
        </p>
      </div>
      
      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className={`block w-full ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-cairo`}
              placeholder={isRtl ? "البحث عن معاملة..." : "Search transactions..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>
          
          <div className="flex items-center">
            <FiFilter className={`h-5 w-5 text-gray-400 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            <select
              className="block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-cairo"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              dir={isRtl ? "rtl" : "ltr"}
            >
              <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="completed">{isRtl ? 'مكتمل' : 'Completed'}</option>
              <option value="pending">{isRtl ? 'قيد الانتظار' : 'Pending'}</option>
              <option value="failed">{isRtl ? 'فشل' : 'Failed'}</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{isRtl ? 'جارِ التحميل...' : 'Loading...'}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {isRtl ? `خطأ: ${error}` : `Error: ${error}`}
                </p>
              </div>
            </div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              {isRtl ? 'لا توجد معاملات متطابقة مع معايير البحث' : 'No transactions matching your search criteria'}
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              <div className="space-y-4">
                {filteredTransactions.map((transaction, index) => (
                  <div key={transaction.id || transaction.transactionId || index} 
                       className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 dark:border-gray-700">
                    
                    {/* Status & Date Row */}
                    <div className="flex justify-between items-center mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                        <span className="font-cairo">{transaction.status || 'Unknown'}</span>
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                        {transaction.date || transaction.createdAt 
                          ? format(new Date(transaction.date || transaction.createdAt), 'PPp', { locale })
                          : '-'}
                      </span>
                    </div>
                    
                    {/* Transaction ID */}
                    <div className="mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                        {isRtl ? 'معرف المعاملة' : 'Transaction ID'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {transaction.transactionId || transaction.id || '-'}
                      </div>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex items-start mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className={`${isRtl ? 'ml-3' : 'mr-3'} mt-1`}>
                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-300">
                            {(transaction.userName || '-').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold text-gray-900 dark:text-white ${isRtl ? 'font-cairo' : ''}`}>
                          {transaction.userName || '-'}
                        </p>
                        <p className={`text-xs text-gray-500 dark:text-gray-400 ${isRtl ? 'font-cairo' : ''}`}>
                          {transaction.userEmail || '-'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Transaction Details */}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      {/* Amount */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className={`h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center ${isRtl ? 'ml-2' : 'mr-2'}`}>
                            <FiDollarSign className="h-3 w-3 text-green-600 dark:text-green-300" />
                          </div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 font-cairo">
                            {isRtl ? 'المبلغ' : 'Amount'}
                          </span>
                        </div>
                        <p className={`text-base font-bold text-gray-900 dark:text-white ${isRtl ? 'font-cairo text-right' : 'font-cairo'}`}>
                          {transaction.amount ? `${transaction.amount} ${transaction.currency || 'SAR'}` : '-'}
                        </p>
                      </div>
                      
                      {/* Payment Method */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className={`h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center ${isRtl ? 'ml-2' : 'mr-2'}`}>
                            <FiCreditCard className="h-3 w-3 text-purple-600 dark:text-purple-300" />
                          </div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 font-cairo">
                            {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium text-gray-900 dark:text-white capitalize ${isRtl ? 'font-cairo text-right' : 'font-cairo'}`}>
                          {transaction.paymentMethod || transaction.method || '-'}
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
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo text-start">
                    {isRtl ? 'معرف المعاملة' : 'Transaction ID'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo text-start">
                    {isRtl ? 'التاريخ' : 'Date'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo text-start">
                    {isRtl ? 'المستخدم' : 'User'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo text-start">
                    {isRtl ? 'المبلغ' : 'Amount'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo text-start">
                    {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo text-start">
                    {isRtl ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id || transaction.transactionId || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {transaction.transactionId || transaction.id || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {transaction.date || transaction.createdAt 
                        ? format(new Date(transaction.date || transaction.createdAt), 'PPp', { locale })
                        : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      <div>{transaction.userName || '-'}</div>
                      <div className="text-xs text-gray-400">{transaction.userEmail || '-'}</div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {transaction.amount ? `${transaction.amount} ${transaction.currency || 'SAR'}` : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${isRtl ? 'text-right' : 'text-left'} font-cairo`}>
                      {transaction.paymentMethod || transaction.method || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRtl ? 'text-right' : 'text-left'}`}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(transaction.status)} font-cairo`}>
                        {getStatusIcon(transaction.status)}
                        {transaction.status || 'Unknown'}
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
