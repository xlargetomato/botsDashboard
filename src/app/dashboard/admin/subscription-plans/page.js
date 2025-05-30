'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useRouter } from 'next/navigation';

export default function SubscriptionPlansAdminPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  
  // State for plans
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for edit mode
  const [editMode, setEditMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // State for new plan
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  
  // Fetch plans function
  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/subscriptions/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      const data = await response.json();
      setPlans(data.plans);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch plans on component mount
  useEffect(() => {
    fetchPlans();
  }, []);
  
  // Handle edit plan
  const handleEditPlan = (plan) => {
    // Parse features if they're stored as a string
    let parsedFeatures = plan.features;
    if (typeof plan.features === 'string') {
      try {
        parsedFeatures = JSON.parse(plan.features);
      } catch (err) {
        console.error('Error parsing features:', err);
        parsedFeatures = [];
      }
    }
    
    setSelectedPlan({
      ...plan,
      features: parsedFeatures
    });
    setEditMode(true);
    setShowNewPlanForm(false);
  };
  
  // Handle new plan
  const handleNewPlan = () => {
    setSelectedPlan({
      id: '',
      name: '',
      description: '',
      price_weekly: 0,
      price_monthly: 0,
      price_yearly: 0,
      features: [],
      is_active: true
    });
    setShowNewPlanForm(true);
    setEditMode(false);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setSelectedPlan(null);
    setEditMode(false);
    setShowNewPlanForm(false);
  };
  
  // Render loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative font-cairo" role="alert">
            <strong className="font-bold font-cairo">Error!</strong>
            <span className="block text-sm font-cairo"> {error}</span>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 rtl:text-right">
          <h1 className="text-xl sm:text-2xl font-bold font-cairo text-gray-900 dark:text-white text-center sm:text-start">
            {isRtl ? 'إدارة خطط الاشتراك' : 'Manage Subscription Plans'}
          </h1>
          <button
            onClick={handleNewPlan}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
          >
            {isRtl ? 'إضافة خطة جديدة' : 'Add New Plan'}
          </button>
        </div>
        
        {/* Display either the plan list, edit form, or new plan form */}
        {!editMode && !showNewPlanForm ? (
          <PlansList plans={plans} onEditPlan={handleEditPlan} setPlans={setPlans} isRtl={isRtl} />
        ) : (
          <PlanForm 
            plan={selectedPlan} 
            onCancel={handleCancelEdit} 
            setPlans={setPlans} 
            plans={plans} 
            isNewPlan={showNewPlanForm}
            isRtl={isRtl}
            fetchPlans={fetchPlans}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Component to display the list of plans
function PlansList({ plans, onEditPlan, setPlans, isRtl }) {
  // Handle plan activation toggle
  const handleToggleActive = async (plan) => {
    try {
      const updatedPlan = { ...plan, is_active: !plan.is_active };
      
      // Update plan status in API
      const response = await fetch(`/api/subscriptions/plans/${plan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !plan.is_active })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update plan status');
      }
      
      // Refresh plans from server to ensure we have the latest data
      await fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      alert(isRtl ? 'حدث خطأ أثناء تحديث حالة الخطة' : 'Error updating plan status');
    }
  };
  
  // Handle plan deletion
  const handleDeletePlan = async (plan) => {
    // Ask for confirmation before deleting
    const confirmMessage = isRtl 
      ? `هل أنت متأكد أنك تريد حذف خطة "${plan.name}"؟`
      : `Are you sure you want to delete the "${plan.name}" plan?`;
      
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Delete the plan via API
      const response = await fetch(`/api/subscriptions/plans/${plan.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete plan');
      }
      
      // Refresh plans from server to ensure we have the latest data
      await fetchPlans();
      
      // Show success message
      alert(isRtl ? 'تم حذف الخطة بنجاح' : 'Plan deleted successfully');
      
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert(isRtl ? 'حدث خطأ أثناء حذف الخطة' : 'Error deleting plan');
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      {/* Desktop view - Table */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-cairo">
                {isRtl ? 'الاسم' : 'Name'}
              </th>
              <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-cairo">
                {isRtl ? 'الوصف' : 'Description'}
              </th>
              <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-cairo">
                {isRtl ? 'السعر الشهري' : 'Monthly Price'}
              </th>
              <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-cairo">
                {isRtl ? 'السعر السنوي' : 'Yearly Price'}
              </th>
              <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-cairo">
                {isRtl ? 'الحالة' : 'Status'}
              </th>
              <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-cairo">
                {isRtl ? 'الإجراءات' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white font-cairo">
                  {plan.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-cairo">
                  {plan.description.length > 30 ? plan.description.substring(0, 30) + '...' : plan.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-cairo">
                  {plan.price_monthly}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-cairo">
                  {plan.price_yearly}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    plan.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {plan.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-3 rtl:flex-row-reverse">
                    <button
                      onClick={() => onEditPlan(plan)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
                    >
                      {isRtl ? 'تعديل' : 'Edit'}
                    </button>
                    {plan.is_active ? (
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm font-cairo"
                      >
                        {isRtl ? 'حذف' : 'Delete'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-md text-sm font-medium font-cairo"
                      >
                        {isRtl ? 'تفعيل' : 'Activate'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile view - Cards */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-4 p-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold font-cairo text-gray-900 dark:text-white">{plan.name}</h3>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  plan.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {plan.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo mb-3">
                {plan.description.length > 50 ? plan.description.substring(0, 50) + '...' : plan.description}
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'شهري' : 'Monthly'}:</span>
                  <span className="font-medium text-gray-900 dark:text-white font-cairo ml-1">{plan.price_monthly}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'سنوي' : 'Yearly'}:</span>
                  <span className="font-medium text-gray-900 dark:text-white font-cairo ml-1">{plan.price_yearly}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-cairo">{isRtl ? 'أسبوعي' : 'Weekly'}:</span>
                  <span className="font-medium text-gray-900 dark:text-white font-cairo ml-1">{plan.price_weekly || '—'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 rtl:flex-row-reverse">
                {isRtl ? (
                  <>
                    {plan.is_active ? (
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm font-cairo"
                      >
                        حذف
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className="w-full px-3 py-2 text-sm bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 font-medium rounded-md shadow-sm font-cairo"
                      >
                        تفعيل
                      </button>
                    )}
                    <button
                      onClick={() => onEditPlan(plan)}
                      className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
                    >
                      تعديل
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onEditPlan(plan)}
                      className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo"
                    >
                      Edit
                    </button>
                    {plan.is_active ? (
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm font-cairo"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className="w-full px-3 py-2 text-sm bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 font-medium rounded-md shadow-sm font-cairo"
                      >
                        Activate
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Component for editing or creating a plan
function PlanForm({ plan, onCancel, setPlans, plans, isNewPlan, isRtl, fetchPlans }) {
  const [formData, setFormData] = useState({
    id: plan.id || '',
    name: plan.name || '',
    description: plan.description || '',
    price_weekly: plan.price_weekly || 0,
    price_monthly: plan.price_monthly || 0,
    price_yearly: plan.price_yearly || 0,
    is_active: plan.is_active !== undefined ? plan.is_active : true
  });
  const [features, setFeatures] = useState(plan.features || []);
  const [newFeature, setNewFeature] = useState({ en: '', ar: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  
  // Add effect to log form data changes
  useEffect(() => {
    console.log('Current form data:', formData);
  }, [formData]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for price fields to ensure they're converted to numbers
    if (name === 'price_weekly' || name === 'price_monthly' || name === 'price_yearly') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prevData => ({
        ...prevData,
        [name]: isNaN(numValue) ? 0 : numValue
      }));
      console.log(`Updated ${name} to:`, numValue);
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear form error when user makes changes
    if (formError) setFormError(null);
  };
  
  // Handle feature input changes
  const handleFeatureChange = (index, lang, value) => {
    const updatedFeatures = [...features];
    updatedFeatures[index][lang] = value;
    setFeatures(updatedFeatures);
    
    // Update formData with the new features
    setFormData({
      ...formData,
      features: updatedFeatures
    });
    
    // Clear form error when user makes changes
    if (formError) setFormError(null);
  };
  
  // Handle new feature input changes
  const handleNewFeatureChange = (lang, value) => {
    setNewFeature({
      ...newFeature,
      [lang]: value
    });
    
    // Clear form error when user makes changes
    if (formError) setFormError(null);
  };
  
  // Add new feature
  const handleAddFeature = () => {
    if (newFeature.en.trim() === '' && newFeature.ar.trim() === '') {
      return;
    }
    
    const updatedFeatures = [...features, { 
      en: newFeature.en.trim(), 
      ar: newFeature.ar.trim() || newFeature.en.trim() 
    }];
    setFeatures(updatedFeatures);
    setNewFeature({ en: '', ar: '' });
    
    // Update formData with the new features
    setFormData({
      ...formData,
      features: updatedFeatures
    });
  };
  
  // Remove feature
  const handleRemoveFeature = (index) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
    
    // Update formData with the new features
    setFormData({
      ...formData,
      features: updatedFeatures
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    
    try {
      // Validate form data
      if (!formData.name || !formData.price_monthly || !formData.price_yearly) {
        throw new Error('Please fill in all required fields');
      }
      
      // Prepare data for API
      const planData = {
        ...formData,
        price_weekly: parseFloat(formData.price_weekly) || 0,
        price_monthly: parseFloat(formData.price_monthly) || 0,
        price_yearly: parseFloat(formData.price_yearly) || 0,
        features: features // Use the features state instead of formData.features
      };
      
      console.log('Submitting plan data:', planData);
      
      let response;
      
      if (isNewPlan) {
        // Create new plan
        response = await fetch('/api/subscriptions/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(planData)
        });
      } else {
        // Update existing plan
        response = await fetch(`/api/subscriptions/plans/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(planData)
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to save plan';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Refresh plans list from server
      await fetchPlans();
      
      // Reset form
      onCancel();
    } catch (error) {
      console.error('Error saving plan:', error);
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 sm:p-6">
      <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white mb-4 sm:mb-6">
        {isNewPlan 
          ? (isRtl ? 'إضافة خطة جديدة' : 'Add New Plan') 
          : (isRtl ? 'تعديل الخطة' : 'Edit Plan')}
      </h2>
      
      {formError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          <p className="font-medium font-cairo">{isRtl ? 'خطأ' : 'Error'}</p>
          <p className="mt-1 text-sm font-cairo">{formError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rtl:text-right mb-6">
          {/* Plan Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-1">
              {isRtl ? 'اسم الخطة' : 'Plan Name'} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
            />
          </div>
          
          {/* Plan Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-1">
              {isRtl ? 'وصف الخطة' : 'Description'} *
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
            />
          </div>
          
          {/* Is Active */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
              {isRtl ? 'نشط' : 'Active'}
            </label>
          </div>
          
          {/* Weekly Price */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-1">
              {isRtl ? 'السعر الأسبوعي' : 'Weekly Price'} *
            </label>
            <input
              type="number"
              name="price_weekly"
              value={formData.price_weekly}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
            />
          </div>
          
          {/* Monthly Price */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-1">
              {isRtl ? 'السعر الشهري' : 'Monthly Price'} *
            </label>
            <input
              type="number"
              name="price_monthly"
              value={formData.price_monthly}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
            />
          </div>
          
          {/* Yearly Price */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-1">
              {isRtl ? 'السعر السنوي' : 'Yearly Price'} *
            </label>
            <input
              type="number"
              name="price_yearly"
              value={formData.price_yearly}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
            />
          </div>
          
          {/* Active Status */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo mb-1">
              {isRtl ? 'الحالة' : 'Status'}
            </label>
            <select
              name="is_active"
              value={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
            >
              <option value="true">{isRtl ? 'نشط' : 'Active'}</option>
              <option value="false">{isRtl ? 'غير نشط' : 'Inactive'}</option>
            </select>
          </div>
        </div>
        
        {/* Features Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white font-cairo mb-3">
            {isRtl ? 'المميزات' : 'Features'}
          </h3>
          
          {/* Feature List */}
          <div className="space-y-3 mb-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 rtl:space-x-reverse">
                <input
                  type="text"
                  value={feature.en}
                  onChange={(e) => handleFeatureChange(index, 'en', e.target.value)}
                  placeholder={isRtl ? 'الميزة (بالإنجليزية)' : 'Feature (English)'}
                  className="w-full px-3 py-2 font-cairo border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                />
                <input
                  type="text"
                  value={feature.ar}
                  onChange={(e) => handleFeatureChange(index, 'ar', e.target.value)}
                  placeholder={isRtl ? 'الميزة (بالعربية)' : 'Feature (Arabic)'}
                  className="w-full px-3 py-2 font-cairo border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          {/* Add New Feature */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:space-x-2 sm:rtl:space-x-reverse space-y-3 sm:space-y-0">
              <div className="flex-1">
                <input
                  type="text"
                  value={newFeature.en}
                  onChange={(e) => handleNewFeatureChange('en', e.target.value)}
                  placeholder={isRtl ? 'ميزة جديدة (بالإنجليزية)' : 'New feature (English)'}
                  className="w-full px-3 py-2 font-cairo border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newFeature.ar}
                  onChange={(e) => handleNewFeatureChange('ar', e.target.value)}
                  placeholder={isRtl ? 'ميزة جديدة (بالعربية)' : 'New feature (Arabic)'}
                  className="w-full px-3 py-2 font-cairo border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddFeature}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {isRtl ? 'إضافة ميزة' : 'Add Feature'}
            </button>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 sm:rtl:space-x-reverse mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-cairo"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm font-cairo focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 font-cairo"
          >
            {saving ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRtl ? 'جاري الحفظ...' : 'Saving...'}
              </span>
            ) : (
              <span>{isRtl ? 'حفظ' : 'Save'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
