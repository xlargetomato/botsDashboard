'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/config';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import TicketList from '@/components/support/TicketList';
import NewTicketForm from '@/components/support/NewTicketForm';
import SupportChat from '@/components/support/SupportChat';
import ClientFaq from '@/components/faqs/ClientFaq';

export default function HelpPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('faq');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  // Support ticket system state
  const [supportView, setSupportView] = useState('list'); // 'list', 'new', 'chat'
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // FAQ state
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqError, setFaqError] = useState(null);

  const handleContactFormChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactFormSubmit = async (e) => {
    e.preventDefault();
    // Add your form submission logic here
    setFormSubmitted(true);
    // Reset form after 3 seconds
    setTimeout(() => setFormSubmitted(false), 3000);
  };
  
  // Support ticket system handlers
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setSupportView('chat');
  };

  const handleNewTicket = () => {
    setSupportView('new');
  };

  const handleTicketCreated = (ticket) => {
    setSelectedTicket(ticket);
    setSupportView('chat');
  };

  const handleBackToList = () => {
    setSupportView('list');
    setSelectedTicket(null);
  };

  // Fetch FAQs from API
  const fetchFaqs = async () => {
    setLoadingFaqs(true);
    setFaqError(null);
    
    try {
      const response = await fetch('/api/faqs');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch FAQs');
      }
      
      setFaqs(data.data || []);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setFaqError(err.message);
    } finally {
      setLoadingFaqs(false);
    }
  };

  // Check authentication status and fetch FAQs
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          setAuthenticated(true);
          // Fetch FAQs after authentication
          fetchFaqs();
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Dynamic FAQ items will be loaded from API

  return (
    <MainLayout sidebar={<DashboardSidebar />}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
            {isRtl ? 'مساعدة' : 'Help & Support'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl 
              ? 'احصل على إجابات لأسئلتك وتواصل مع فريق الدعم' 
              : 'Get answers to your questions and contact our support team'}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
            <div className={`flex ${isRtl ? 'space-x-reverse space-x-4' : 'space-x-4'} border-b dark:border-gray-700 mb-6`}>
              <button
                onClick={() => setActiveTab('faq')}
                className={`py-2 px-4 font-cairo ${activeTab === 'faq' ? 'text-blue-500 border-b-2 border-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {isRtl ? 'الأسئلة الشائعة' : 'FAQ'}
              </button>

              <button
                onClick={() => setActiveTab('support')}
                className={`py-2 px-4 font-cairo ${activeTab === 'support' ? 'text-blue-500 border-b-2 border-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {isRtl ? 'الدعم الفني' : 'Support Tickets'}
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-2 px-4 font-cairo ${activeTab === 'docs' ? 'text-blue-500 border-b-2 border-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {isRtl ? 'دليل المستخدم' : 'Documentation'}
              </button>
            </div>
          </div>
          <div className="p-6">
            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="space-y-6">
                
                {loadingFaqs ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 font-cairo">{t('common.loading')}</p>
                  </div>
                ) : faqError ? (
                  <div className="py-8 text-center">
                    <p className="text-red-500 font-cairo">{faqError}</p>
                  </div>
                ) : (
                  <ClientFaq faqs={faqs} />
                )}
              </div>
            )}

            {/* Documentation Tab */}
            {activeTab === 'docs' && (
              <div>
                <h2 className="text-xl font-bold font-cairo text-gray-900 dark:text-white mb-4">
                  {isRtl ? 'دليل المستخدم' : 'Documentation'}
                </h2>
                
                <div className="space-y-6 font-cairo text-gray-600 dark:text-gray-300">
                  <p>
                    {isRtl 
                      ? 'استكشف توثيق منصتنا للحصول على معلومات مفصلة حول كيفية استخدام ميزات البوت المختلفة.' 
                      : 'Explore our platform documentation for detailed information on how to use various bot features.'}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isRtl ? 'دليل البدء السريع' : 'Quick Start Guide'}
                      </h3>
                      <p className="text-sm">
                        {isRtl 
                          ? 'تعلم كيفية إعداد وتكوين البوت الخاص بك بسرعة.' 
                          : 'Learn how to quickly set up and configure your bot.'}
                      </p>
                    </div>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isRtl ? 'واجهة برمجة التطبيقات (API)' : 'API Reference'}
                      </h3>
                      <p className="text-sm">
                        {isRtl 
                          ? 'استكشف واجهة برمجة التطبيقات الخاصة بنا لدمج البوت مع تطبيقاتك.' 
                          : 'Explore our API for integrating the bot with your applications.'}
                      </p>
                    </div>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isRtl ? 'أمثلة وقوالب' : 'Examples & Templates'}
                      </h3>
                      <p className="text-sm">
                        {isRtl 
                          ? 'استخدم القوالب الجاهزة لإنشاء بوتات مخصصة بسرعة.' 
                          : 'Use ready-made templates to quickly create custom bots.'}
                      </p>
                    </div>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isRtl ? 'أفضل الممارسات' : 'Best Practices'}
                      </h3>
                      <p className="text-sm">
                        {isRtl 
                          ? 'تعلم أفضل الممارسات لتحسين أداء البوت الخاص بك.' 
                          : 'Learn best practices to optimize your bot performance.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Support Tickets Tab */}
            {activeTab === 'support' && (
              <div className="mt-6">
                <h2 className={`text-xl font-bold font-cairo text-gray-900 dark:text-white mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'الدعم الفني' : 'Support Tickets'}
                </h2>
                
                {supportView === 'list' && (
                  <TicketList 
                    onSelectTicket={handleSelectTicket} 
                    onNewTicket={handleNewTicket}
                    isRtl={isRtl}
                  />
                )}
                
                {supportView === 'new' && (
                  <div>
                    <button 
                      onClick={handleBackToList}
                      className="mb-4 flex items-center text-blue-500 hover:text-blue-600 font-cairo"
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-1' : 'mr-1'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      {isRtl ? 'العودة إلى القائمة' : 'Back to list'}
                    </button>
                    <NewTicketForm 
                      onSubmit={handleTicketCreated} 
                      onCancel={handleBackToList}
                      isRtl={isRtl}
                    />
                  </div>
                )}
                
                {supportView === 'chat' && selectedTicket && (
                  <div>
                    <button 
                      onClick={handleBackToList}
                      className="mb-4 flex items-center text-blue-500 hover:text-blue-600 font-cairo"
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-1' : 'mr-1'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      {isRtl ? 'العودة إلى القائمة' : 'Back to list'}
                    </button>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                      <div className="mb-4 pb-4 border-b dark:border-gray-700">
                        <h2 className="text-xl font-semibold font-cairo text-gray-900 dark:text-white">
                          {selectedTicket.subject}
                        </h2>
                        <div className="flex items-center mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-cairo ${
                            selectedTicket.status === 'open'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {selectedTicket.status === 'open'
                              ? isRtl ? 'مفتوح' : 'Open'
                              : isRtl ? 'مغلق' : 'Closed'}
                          </span>
                          <span className="ml-2 rtl:mr-2 rtl:ml-0 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(selectedTicket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <SupportChat 
                        ticketId={selectedTicket.id} 
                        onClose={handleBackToList}
                        isRtl={isRtl}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
