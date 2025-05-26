'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import AdminSidebar from '@/components/dashboard/AdminSidebar';
import FaqList from '@/components/faqs/FaqList';
import FaqForm from '@/components/faqs/FaqForm';
import { AlertCircle } from 'lucide-react';

export default function AdminFaqsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingFaq, setEditingFaq] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Fetch FAQs
  const fetchFaqs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/faqs');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch FAQs');
      }
      
      setFaqs(data.data || []);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFaqs();
  }, []);
  
  // Handle creating/updating FAQ
  const handleSubmitFaq = async (formData) => {
    try {
      let response;
      
      if (editingFaq) {
        // Update existing FAQ
        response = await fetch(`/api/admin/faqs/${editingFaq.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new FAQ
        response = await fetch('/api/admin/faqs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save FAQ');
      }
      
      // Refresh FAQs list
      fetchFaqs();
      
      // Close form
      setEditingFaq(null);
      setShowForm(false);
      
    } catch (err) {
      console.error('Error saving FAQ:', err);
      setError(err.message);
    }
  };
  
  // Handle deleting FAQ
  const handleDeleteFaq = async (id) => {
    if (!window.confirm(t('common.admin.deleteConfirmation'))) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete FAQ');
      }
      
      // Refresh FAQs list
      fetchFaqs();
      
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      setError(err.message);
    }
  };
  
  // Handle editing FAQ
  const handleEditFaq = (faq) => {
    setEditingFaq(faq);
    setShowForm(true);
  };
  
  // Handle reordering FAQs
  const handleReorderFaqs = async (updatedFaqs) => {
    try {
      // Update each FAQ's order
      const updatePromises = updatedFaqs.map(faq => {
        return fetch(`/api/admin/faqs/${faq.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order_index: faq.order_index }),
        });
      });
      
      await Promise.all(updatePromises);
      
      // No need to refresh as the UI is already updated
      
    } catch (err) {
      console.error('Error reordering FAQs:', err);
      setError(err.message);
      
      // Refresh to get the correct order if there was an error
      fetchFaqs();
    }
  };
  
  // Handle scrolling to top when opening form on mobile
  const handleOpenForm = (faq = null) => {
    setEditingFaq(faq);
    setShowForm(true);
    // Scroll to top on mobile when opening form
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Update the edit handler to use the new function
  const handleEditWithScroll = (faq) => {
    handleOpenForm(faq);
  };

  return (
    <MainLayout sidebar={<AdminSidebar />}>
      <div className={`container px-3 sm:px-4 py-4 sm:py-8 ${isRtl ? 'rtl' : 'ltr'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold font-cairo text-gray-900 dark:text-white">{t('common.admin.faq.faqs')}</h1>
          
          {/* Back button for mobile when form is shown */}
          {showForm && (
            <button
              onClick={() => {
                setEditingFaq(null);
                setShowForm(false);
              }}
              className="mt-2 sm:hidden px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              {t('common.admin.backToList')}
            </button>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4 sm:mb-6 flex items-start">
            <AlertCircle className="me-2 mt-0.5 flex-shrink-0" size={18} />
            <span className="font-cairo">{error}</span>
          </div>
        )}
        
        {/* FAQ Form */}
        {showForm ? (
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm mb-4 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 font-cairo text-gray-900 dark:text-white">
              {editingFaq ? t('common.admin.faq.editFaq') : t('common.admin.faq.createFaq')}
            </h2>
            <FaqForm
              faq={editingFaq}
              onSubmit={handleSubmitFaq}
              onCancel={() => {
                setEditingFaq(null);
                setShowForm(false);
              }}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm mb-4 sm:mb-8">
            {isLoading ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 font-cairo">{t('common.loading')}</p>
              </div>
            ) : (
              <FaqList
                faqs={faqs}
                onEdit={handleEditWithScroll}
                onDelete={handleDeleteFaq}
                onReorder={handleReorderFaqs}
              />
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}