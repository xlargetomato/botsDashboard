'use client';

import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiX, FiSearch, FiFilter, FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useTranslation } from '@/lib/i18n/config';

export default function CouponsManagement() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentCoupon, setCurrentCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    valid_from: '',
    valid_until: '',
    max_uses: '',
    is_active: true,
    auto_generate: false,
    code_length: 6
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/coupons', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include credentials to ensure cookies are sent with the request
          credentials: 'include'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Ensure we received an array of coupons
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array of coupons');
      }
      
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setError(error.message || 'Failed to fetch coupons');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateCode = () => {
    const newCode = generateRandomCode(formData.code_length);
    setFormData(prev => ({
      ...prev,
      code: newCode
    }));
  };

  const handleCreateClick = () => {
    setModalMode('create');
    setCurrentCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      valid_from: formatDateForInput(new Date()),
      valid_until: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      max_uses: 100,
      is_active: true,
      auto_generate: false,
      code_length: 6
    });
    setShowModal(true);
  };

  const handleEditClick = (coupon) => {
    setModalMode('edit');
    setCurrentCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      valid_from: formatDateForInput(new Date(coupon.valid_from)),
      valid_until: formatDateForInput(new Date(coupon.valid_until)),
      max_uses: coupon.max_uses || '',
      is_active: coupon.is_active
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare the data to be sent
    const requestData = {
      ...formData,
      // Only send code if not in auto-generate mode
      ...(formData.auto_generate ? { code: undefined } : {})
    };
    
    try {
      let response;
      
      if (modalMode === 'create') {
        response = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...requestData,
            auto_generate: formData.auto_generate,
            code_length: formData.code_length
          }),
        });
      } else {
        response = await fetch(`/api/admin/coupons/${currentCoupon.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      }
      
      if (response.ok) {
        const newCoupon = await response.json();
        if (modalMode === 'create') {
          setCoupons([newCoupon, ...coupons]);
        } else {
          setCoupons(coupons.map(c => c.id === currentCoupon.id ? newCoupon : c));
        }
        handleCloseModal();
      } else {
        console.error(`Failed to ${modalMode} coupon`);
      }
    } catch (error) {
      console.error(`Error ${modalMode}ing coupon:`, error);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm(isRtl ? 'هل أنت متأكد أنك تريد حذف هذا الكوبون؟' : 'Are you sure you want to delete this coupon?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setCoupons(coupons.filter(coupon => coupon.id !== couponId));
      } else {
        console.error('Failed to delete coupon');
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US');
  };
  
  // Format discount value for display
  const formatDiscount = (coupon) => {
    // Ensure discount_value is a number
    const discountValue = parseFloat(coupon.discount_value);
    
    if (isNaN(discountValue)) {
      return coupon.discount_type === 'percentage' ? '0%' : '$0.00';
    }
    
    if (coupon.discount_type === 'percentage') {
      return `${discountValue}%`;
    } else {
      return `ريال ${discountValue.toFixed(2)}`;
    }
  };

  // Check if coupon is expired
  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date();
  };

  // Get coupon status
  const getCouponStatus = (coupon) => {
    if (!coupon.is_active) {
      return { status: 'inactive', color: 'gray' };
    }
    if (isExpired(coupon.valid_until)) {
      return { status: 'expired', color: 'red' };
    }
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return { status: 'exhausted', color: 'orange' };
    }
    if (new Date(coupon.valid_from) > new Date()) {
      return { status: 'upcoming', color: 'blue' };
    }
    return { status: 'active', color: 'green' };
  };

  // No static data - all data comes from the API

  return (
    <AdminLayout>
      <div className="px-4 py-6 sm:px-0" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <FiPlus className={`h-5 w-5 text-indigo-600 dark:text-indigo-400 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'إدارة الكوبونات' : 'Coupons Management'}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FiPlus className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
            <span className="font-cairo">{isRtl ? 'إنشاء كوبون' : 'Create Coupon'}</span>
          </button>
        </div>
        
        {/* Search Box */}
        <div className="mb-6">
          <div className="relative rounded-md shadow-sm">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className={`block w-full ${isRtl ? 'pr-10 text-right' : 'pl-10 text-left'} py-2 sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 font-cairo`}
              placeholder={isRtl ? 'البحث عن كوبونات...' : 'Search coupons...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Error message display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className={`${isRtl ? 'mr-3' : 'ml-3'} flex-1`}>
                <p className="text-sm font-medium text-red-800 dark:text-red-200 font-cairo">{isRtl ? 'خطأ' : 'Error'}</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <div className={`${isRtl ? 'mr-auto' : 'ml-auto'} ${isRtl ? 'pl-3' : 'pl-3'}`}>
                <button
                  onClick={() => fetchCoupons()}
                  className="inline-flex bg-red-50 dark:bg-red-900/30 rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  aria-label={isRtl ? 'إعادة المحاولة' : 'Retry'}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coupons Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Mobile card view */}
          <div className="md:hidden p-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8">
                <FiX className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'لا توجد كوبونات' : 'No coupons found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {coupons.filter(coupon => 
                  searchTerm === '' || 
                  coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <div key={coupon.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                      {/* Header: Code & Status */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            {coupon.code}
                          </span>
                        </div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${status.color}-100 text-${status.color}-800 dark:bg-${status.color}-900 dark:text-${status.color}-200`}>
                          {isRtl ? 
                            status.status === 'active' ? 'نشط' :
                            status.status === 'inactive' ? 'غير نشط' :
                            status.status === 'expired' ? 'منتهي الصلاحية' :
                            status.status === 'upcoming' ? 'قادم' : 'مستنفد'
                            : 
                            status.status === 'active' ? 'Active' :
                            status.status === 'inactive' ? 'Inactive' :
                            status.status === 'expired' ? 'Expired' :
                            status.status === 'upcoming' ? 'Upcoming' : 'Exhausted'
                          }
                        </span>
                      </div>
                      
                      {/* Discount */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                            {isRtl ? 'الخصم' : 'Discount'}
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDiscount(coupon)}
                            <span className="text-xs ml-1 text-gray-500">
                              ({coupon.discount_type === 'percentage' ? '%' : '$'})
                            </span>
                          </p>
                        </div>
                        
                        {/* Usage */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                            {isRtl ? 'الاستخدام' : 'Usage'}
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {coupon.current_uses}{coupon.max_uses !== null && (
                              <span> / {coupon.max_uses}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Validity Period */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded mb-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-cairo">
                          {isRtl ? 'فترة الصلاحية' : 'Valid Period'}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(coupon.valid_from)} - {formatDate(coupon.valid_until)}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex justify-end space-x-2 rtl:space-x-reverse mt-2">
                        <button
                          onClick={() => handleEditClick(coupon)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <FiEdit2 className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                          <span className="font-cairo">{isRtl ? 'تعديل' : 'Edit'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <FiTrash2 className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                          <span className="font-cairo">{isRtl ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo">
                    {isRtl ? 'الرمز' : 'Code'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo">
                    {isRtl ? 'الخصم' : 'Discount'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo">
                    {isRtl ? 'فترة الصلاحية' : 'Valid Period'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo">
                    {isRtl ? 'الاستخدام' : 'Usage'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo">
                    {isRtl ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-cairo">
                    {isRtl ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {isRtl ? 'جاري التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {isRtl ? 'لم يتم العثور على كوبونات' : 'No coupons found'}
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {coupon.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDiscount(coupon)}
                          <span className="text-xs ml-1 text-gray-400 dark:text-gray-500">
                            ({coupon.discount_type === 'percentage' ? '%' : '$'})
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            {formatDate(coupon.valid_from)} - {formatDate(coupon.valid_until)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {coupon.current_uses} 
                          {coupon.max_uses !== null && (
                            <span> / {coupon.max_uses}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                            {isRtl ? 
                              status.status === 'active' ? 'نشط' :
                              status.status === 'inactive' ? 'غير نشط' :
                              status.status === 'expired' ? 'منتهي الصلاحية' :
                              status.status === 'upcoming' ? 'قادم' : 'مستنفد'
                              : 
                              status.status === 'active' ? 'Active' :
                              status.status === 'inactive' ? 'Inactive' :
                              status.status === 'expired' ? 'Expired' :
                              status.status === 'upcoming' ? 'Upcoming' : 'Exhausted'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <button
                              onClick={() => handleEditClick(coupon)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              aria-label={isRtl ? 'تعديل' : 'Edit'}
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              aria-label={isRtl ? 'حذف' : 'Delete'}
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Coupon Modal */}
        {showModal && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleCloseModal}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full mx-auto shadow-xl z-10" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white font-cairo">
                    {modalMode === 'create' 
                      ? (isRtl ? 'إنشاء كوبون' : 'Create Coupon')
                      : (isRtl ? 'تعديل كوبون' : 'Edit Coupon')
                    }
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                    aria-label={isRtl ? 'إغلاق' : 'Close'}
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                            {isRtl ? 'رمز الكوبون' : 'Coupon Code'}
                          </label>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="auto_generate"
                              name="auto_generate"
                              checked={formData.auto_generate}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  auto_generate: isChecked,
                                  ...(isChecked && { code: generateRandomCode(formData.code_length) })
                                }));
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="auto_generate" className={`${isRtl ? 'mr-2' : 'ml-2'} text-sm text-gray-700 dark:text-gray-300 font-cairo`}>
                              {isRtl ? 'توليد تلقائي' : 'Auto-generate'}
                            </label>
                            {formData.auto_generate && (
                              <div className={`flex items-center ${isRtl ? 'mr-3' : 'ml-3'}`}>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                  {isRtl ? 'الطول:' : 'Length:'}
                                </span>
                                <select
                                  name="code_length"
                                  value={formData.code_length}
                                  onChange={(e) => {
                                    const length = parseInt(e.target.value);
                                    setFormData(prev => ({
                                      ...prev,
                                      code_length: length,
                                      code: generateRandomCode(length)
                                    }));
                                  }}
                                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {[4, 5, 6, 7, 8].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="text"
                            name="code"
                            id="code"
                            className={`flex-1 min-w-0 block w-full border ${formData.auto_generate ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'} rounded-l-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white`}
                            value={formData.code}
                            onChange={handleInputChange}
                            required
                            disabled={formData.auto_generate}
                          />
                          {formData.auto_generate && (
                            <button
                              type="button"
                              onClick={handleGenerateCode}
                              className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {isRtl ? 'تحديث' : 'Refresh'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="discount_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                          {isRtl ? 'نوع الخصم' : 'Discount Type'}
                        </label>
                        <select
                          name="discount_type"
                          id="discount_type"
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={formData.discount_type}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="percentage">{isRtl ? 'نسبة مئوية' : 'Percentage'}</option>
                          <option value="fixed">{isRtl ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="discount_value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                          {isRtl ? 'قيمة الخصم' : 'Discount Value'}
                        </label>
                        <input
                          type="number"
                          name="discount_value"
                          id="discount_value"
                          min="0"
                          step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={formData.discount_value}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="valid_from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                            {isRtl ? 'صالح من' : 'Valid From'}
                          </label>
                          <input
                            type="date"
                            name="valid_from"
                            id="valid_from"
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.valid_from}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                            {isRtl ? 'صالح حتى' : 'Valid Until'}
                          </label>
                          <input
                            type="date"
                            name="valid_until"
                            id="valid_until"
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.valid_until}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                          {isRtl ? 'الحد الأقصى للاستخدام' : 'Max Uses'}
                        </label>
                        <input
                          type="number"
                          name="max_uses"
                          id="max_uses"
                          min="1"
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={formData.max_uses}
                          onChange={handleInputChange}
                          placeholder={isRtl ? 'اترك فارغاً لغير محدود' : 'Leave empty for unlimited'}
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_active"
                          id="is_active"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                        />
                        <label htmlFor="is_active" className={`${isRtl ? 'mr-2' : 'ml-2'} block text-sm text-gray-700 dark:text-gray-300 font-cairo`}>
                          {isRtl ? 'نشط' : 'Active'}
                        </label>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse rtl:flex-row">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        <span className="font-cairo">
                          {modalMode === 'create' 
                            ? (isRtl ? 'إنشاء' : 'Create')
                            : (isRtl ? 'حفظ التغييرات' : 'Save Changes')
                          }
                        </span>
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={handleCloseModal}
                      >
                        <span className="font-cairo">{isRtl ? 'إلغاء' : 'Cancel'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}