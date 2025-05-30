'use client';

import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CurrencySymbol from '@/components/subscriptions/CurrencySymbol';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const isRtl = i18n.language === 'ar';
  const [isLoaded, setIsLoaded] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionType, setSubscriptionType] = useState('yearly');
  const [loading, setLoading] = useState(true);

  // Animation effect on page load
  useEffect(() => {
    setIsLoaded(true);
    
    // Fetch subscription plans
    const fetchSubscriptionPlans = async () => {
      try {
        const response = await fetch('/api/subscriptions/plans');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionPlans(data.plans || []);
        }
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionPlans();
  }, []);
  
  // Handle subscription type change
  const handleSubscriptionTypeChange = (type) => {
    setSubscriptionType(type);
  };
  
  // Handle plan selection
  const handleSelectPlan = (plan) => {
    // Get price based on selected subscription type
    let price;
    switch (subscriptionType) {
      case 'weekly':
        price = parseFloat(plan.price_weekly) || parseFloat(plan.price_monthly) / 4 || 0;
        break;
      case 'monthly':
        price = parseFloat(plan.price_monthly) || 0;
        break;
      case 'yearly':
      default:
        price = parseFloat(plan.price_yearly) || 0;
        break;
    }
    
    // Store selected plan in session storage
    sessionStorage.setItem('selectedPlan', JSON.stringify({
      id: plan.id,
      name: plan.name,
      price: price,
      type: subscriptionType,
      subscription_type: subscriptionType
    }));
    
    // Redirect to login if not authenticated, or to checkout if authenticated
    router.push('/login?redirect=/dashboard/client/subscriptions/checkout');
  };

  return (
    <div className={`min-h-screen ${isRtl ? 'rtl' : 'ltr'} ${theme === 'dark' ? 'dark' : ''}`}>
      <main>
      {/* Hero Section with Enhanced 3D Bot Effect */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Enhanced Abstract Background with multiple gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 opacity-95"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%221%22 fill=%22%23fff%22 fill-opacity=%220.12%22/%3E%3C/svg%3E')] bg-[length:24px_24px] opacity-20"></div>
        
        {/* Enhanced Animated Elements */}
        <div className="absolute top-20 right-20 rtl:right-auto rtl:left-20 w-40 h-40 bg-gradient-to-r from-green-400 to-teal-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 left-40 rtl:left-auto rtl:right-40 w-52 h-52 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-15 blur-3xl animate-pulse" style={{animationDuration: '7s'}}></div>
        <div className="absolute top-1/2 left-1/4 rtl:left-auto rtl:right-1/4 w-24 h-24 bg-gradient-to-r from-pink-400 to-red-500 rounded-full opacity-10 blur-xl animate-bounce" style={{animationDuration: '10s'}}></div>
        
        <div className={`container relative mx-auto px-6 z-10 transition-all duration-1000 ${isLoaded ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-8'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className={`text-white ${isRtl ? 'order-1 lg:order-1' : 'order-1 lg:order-1'} space-y-8`}>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 rtl:mr-0 rtl:ml-2 animate-pulse"></span>
                <span className="text-sm font-medium font-cairo">
                  {isRtl ? 'متاح الآن' : 'Now Available'}
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold font-cairo leading-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">
                {isRtl 
                  ? 'بوتات واتساب ذكية لنمو أعمالك'
                  : 'Intelligent WhatsApp Bots for Business Growth'}
              </h1>
              <p className="text-xl text-blue-100 font-cairo max-w-lg leading-relaxed">
                {isRtl
                  ? 'قم بأتمتة المحادثات وتعزيز تفاعل العملاء وزيادة المبيعات بواسطة بوتات واتساب المدعومة بالذكاء الاصطناعي.'
                  : 'Automate conversations, boost customer engagement, and increase sales with AI-powered WhatsApp bots.'}
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 rtl:space-x-reverse pt-4">
                <Link href="/register" 
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-center overflow-hidden shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center justify-center font-cairo">
                    {t('common.cta.getStarted')}
                    <svg className={`w-5 h-5 ${isRtl ? 'mr-2 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M19 12H5m7 7l-7-7 7-7" : "M5 12h14m-7 7l7-7-7-7"} />
                    </svg>
                  </span>
                </Link>
                <a href="#features" 
                  className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-center hover:bg-white/20 transition-all duration-300 font-medium font-cairo shadow-lg">
                  {t('common.cta.learnMore')}
                </a>
              </div>
            </div>
            
{/* Enhanced 3D Phone Mockup with WhatsApp Bot - Fully supports Arabic */}
<div className="relative hidden lg:block transform-gpu">
  <div className={`relative transform ${isRtl ? '-rotate-12 hover:-rotate-6' : 'rotate-12 hover:rotate-6'} transition-all duration-500 ${isLoaded ? 'translate-y-0' : 'translate-y-12'} hover:scale-105`}>
    {/* Glow Effects */}
    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[50px] blur-2xl"></div>
    <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/30 to-blue-500/30 rounded-[45px] blur-xl animate-pulse"></div>
    
    <div className="w-80 h-[500px] bg-gradient-to-b from-gray-900 to-black rounded-[40px] p-3 shadow-2xl border border-gray-700/50 mx-auto backdrop-blur-sm">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[32px] h-full overflow-hidden relative flex flex-col border border-gray-600/30">
        
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 flex items-center space-x-3 rtl:space-x-reverse rounded-t-[32px] shadow-lg">
          <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
          </div>
          <div className="text-white">
            <div className="font-semibold text-lg">
              {isRtl ? 'بوت واتساب الذكي' : 'Smart WhatsApp Bot'}
            </div>
            <div className="text-green-100 text-xs flex items-center">
              <div className="w-2 h-2 bg-green-300 rounded-full mr-1 animate-pulse"></div>
              {isRtl ? 'متصل' : 'Online'}
            </div>
          </div>
        </div>

        {/* Chat area with enhanced design */}
        <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex-1 p-4 overflow-y-auto space-y-4 relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2220%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]">
          </div>

          {/* User message */}
          <div className="relative">
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 ml-auto rtl:mr-auto rtl:ml-0 w-4/5 shadow-lg transform hover:scale-105 transition-transform">
              <p className="text-sm text-white font-medium">
                {isRtl
                  ? 'هل يمكنني تخصيص الردود الآلية؟'
                  : 'Can I customize auto-replies?'}
              </p>
              <p className="text-blue-100 text-xs text-right rtl:text-left mt-2 flex items-center justify-end rtl:justify-start">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {isRtl ? '9:01 ص' : '9:01 AM'}
              </p>
            </div>
          </div>

          {/* Bot message */}
          <div className="relative">
            <div className="rounded-2xl bg-white dark:bg-gray-700 p-4 shadow-lg mr-auto rtl:ml-auto rtl:mr-0 w-4/5 border border-gray-200/50 dark:border-gray-600/50 transform hover:scale-105 transition-transform">
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                {isRtl
                  ? 'نعم! يمكنك تخصيص كل شيء بسهولة تامة 🎯'
                  : 'Absolutely! You can customize everything easily 🎯'}
              </p>
              <p className="text-gray-500 text-xs mt-2 flex items-center">
                <span className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 mr-2 inline-block"></span>
                {isRtl ? 'البوت • 9:02 ص' : 'Bot • 9:02 AM'}
              </p>
            </div>
          </div>

          {/* Enhanced typing indicator */}
          <div className="relative">
            <div className="rounded-2xl bg-white dark:bg-gray-700 p-4 shadow-lg w-20 mr-auto rtl:ml-auto rtl:mr-0 border border-gray-200/50 dark:border-gray-600/50">
              <div className="flex space-x-1 rtl:space-x-reverse justify-center">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-red-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 text-xs text-center rounded-b-[32px] border-t border-gray-700/50">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>
              {isRtl
                ? 'يعمل بالذكاء الاصطناعي'
                : 'Powered by AI'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


          </div>
        </div>
        
        {/* Wave Separator - SVG directly embedded for better control */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="fill-white dark:fill-gray-900">
            <path d="M0,64L60,58.7C120,53,240,43,360,48C480,53,600,75,720,80C840,85,960,75,1080,69.3C1200,64,1320,64,1380,64L1440,64L1440,100L1380,100C1320,100,1200,100,1080,100C960,100,840,100,720,100C600,100,480,100,360,100C240,100,120,100,60,100L0,100Z"></path>
          </svg>
        </div>
      </section>

{/* Enhanced Stats Section with Modern UI Elements */}
<section className="py-16 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
  <div className="container mx-auto px-6">
    <div className="text-center mb-10">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo mb-2">
        {isRtl ? 'مميزات متقدمة' : 'Advanced Capabilities'}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-cairo">
        {isRtl ? 'بوتات ذكية مدعومة بالذكاء الاصطناعي تعمل على مدار الساعة لتعزيز تجربة عملائك' : 'AI-powered smart bots working around the clock to enhance your customer experience'}
      </p>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      {/* 24/7 Availability */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2 font-cairo">24/7</div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">
          {isRtl ? 'متاح دائماً للرد على العملاء' : 'Always available to respond to customers'}
        </p>
      </div>
      
      {/* Customizable */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2 font-cairo">100%</div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">
          {isRtl ? 'قابل للتخصيص بالكامل' : 'Fully customizable to your needs'}
        </p>
      </div>
      
      {/* Secure */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2 font-cairo">
          {isRtl ? 'مؤمن' : 'Secure'}
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">
          {isRtl ? 'حماية كاملة للبيانات والخصوصية' : 'Complete data and privacy protection'}
        </p>
      </div>
      
      {/* Fast */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2 font-cairo">
          <span className="inline-flex items-center">
            <span className="mr-1 rtl:mr-0 rtl:ml-1">5x</span>
            {isRtl ? 'أسرع' : 'Faster'}
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">
          {isRtl ? 'استجابة فورية وسريعة للعملاء' : 'Instant and rapid response to customers'}
        </p>
      </div>
    </div>
    
    {/* Divider with subtle design */}
    <div className="relative mt-16 mb-8">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
      </div>
      <div className="relative flex justify-center">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400 font-cairo">
          {isRtl ? 'الأفضل في السوق' : 'Best in the market'}
        </div>
      </div>
    </div>
  </div>
</section>

    
      
      {/* Feature Cards Section - Enhanced with animations */}
<section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
  <div className="container mx-auto px-6">
    <div className="text-center mb-16">
      <div className="inline-block p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold mb-4 font-cairo">
        {isRtl ? 'ميزات بوت واتساب المتقدمة' : 'Advanced WhatsApp Bot Features'}
      </h2>
      <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-cairo">
        {isRtl ? 'أدوات قوية لإنشاء بوتات واتساب ذكية تنمي عملك وتحسن تجربة العملاء' : 'Powerful tools to create intelligent WhatsApp bots that grow your business and enhance customer experience'}
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Feature Card 1 - Auto Replies */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="h-2 bg-green-500"></div>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 group-hover:bg-green-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600 dark:text-green-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-3 font-cairo group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {isRtl ? 'الردود التلقائية' : 'Auto Replies'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'إعداد ردود آلية مخصصة للاستفسارات الشائعة، مما يوفر وقت فريقك ويضمن استجابة فورية للعملاء.' : 'Set up customized automatic responses to common inquiries, saving your team time and ensuring immediate customer engagement.'}
          </p>
        </div>
      </div>

      {/* Feature Card 2 - Button System */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="h-2 bg-blue-500"></div>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-3 font-cairo group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {isRtl ? 'منظومة الأزرار' : 'Button System'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'إنشاء قوائم تفاعلية باستخدام أزرار سهلة الاستخدام تساعد العملاء على التنقل في المحادثة بسلاسة.' : 'Create interactive menus with easy-to-use buttons that help customers navigate through the conversation seamlessly.'}
          </p>
        </div>
      </div>

      {/* Feature Card 3 - Call Blocking */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="h-2 bg-purple-500"></div>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6 group-hover:bg-purple-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-600 dark:text-purple-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-3 font-cairo group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {isRtl ? 'منع الاتصالات' : 'Call Blocking'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'حماية خصوصيتك وتقليل الإزعاج من خلال ميزة حظر المكالمات المتكررة والأرقام غير المرغوب فيها.' : 'Protect your privacy and reduce disturbances with automatic blocking of repeated calls and unwanted numbers.'}
          </p>
        </div>
      </div>

      {/* Feature Card 4 - Mass Messaging */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="h-2 bg-yellow-500"></div>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-6 group-hover:bg-yellow-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-600 dark:text-yellow-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-3 font-cairo group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
            {isRtl ? 'رسالة جماعية' : 'Mass Messaging'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'إرسال إشعارات وتحديثات وعروض ترويجية إلى مجموعات محددة من العملاء بنقرة واحدة فقط.' : 'Send notifications, updates, and promotional offers to specified groups of customers with just a single click.'}
          </p>
        </div>
      </div>

      {/* Feature Card 5 - Slow Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="h-2 bg-red-500"></div>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 group-hover:bg-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600 dark:text-red-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-3 font-cairo group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
            {isRtl ? 'الوضع البطيء' : 'Slow Mode'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'التحكم في تدفق الرسائل عن طريق تحديد فترة انتظار بين الرسائل لتجنب الإغراق وإدارة الضغط.' : 'Control message flow by setting a waiting period between messages to avoid flooding and manage pressure during high-traffic periods.'}
          </p>
        </div>
      </div>

      {/* Feature Card 6 - Welcome Message */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
        <div className="h-2 bg-indigo-500"></div>
        <div className="p-8">
          <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6 group-hover:bg-indigo-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-3 font-cairo group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {isRtl ? 'رسالة ترحيب' : 'Welcome Message'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 font-cairo">
            {isRtl ? 'انطباع أول قوي مع رسائل ترحيبية مخصصة تعرف العملاء بخدماتك وتوجههم لكيفية التفاعل مع البوت.' : 'Create a strong first impression with customized welcome messages that introduce your services and guide customers on interacting with the bot.'}
          </p>
        </div>
      </div>
    </div>
    
    {/* Additional "and more..." text */}
    <div className="text-center mt-12">
      <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold font-cairo">
        {isRtl ? 'والمزيد...' : 'And more...'}
      </p>
      <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto font-cairo">
        {isRtl ? 'تحديد أنواع الرسائل المسموحة، قائمة المستخدمين، قائمة المحظورين، ساعات العمل، تشغيل وإيقاف البوت، وأكثر!' : 'Message type filtering, user lists, blocked user management, business hours, bot on/off toggle, and much more!'}
      </p>
    </div>
  </div>
</section>
  {/* Stylish Divider Section */}
  <section className=" bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="relative">
            
            <div className="relative flex flex-col items-center justify-center space-y-6">
              <div className="h-0.5 w-full max-w-3xl bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
              
              
            </div>
          </div>
        </div>
      </section>
      {/* Subscription Plans Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white font-cairo">
              {isRtl ? 'خطط الاشتراك' : 'Subscription Plans'}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-cairo">
              {isRtl
                ? 'اختر خطة الاشتراك التي تناسب احتياجاتك وميزانيتك'
                : 'Choose a subscription plan that fits your needs and budget'}
            </p>
            
            {/* Subscription type selector */}
            <div className="mt-8 inline-flex rounded-md shadow-md">
              <button
                type="button"
                onClick={() => handleSubscriptionTypeChange('weekly')}
                className={`px-4 py-2 text-sm font-medium ${isRtl ? 'rounded-r-md font-cairo' : 'rounded-l-md'} ${subscriptionType === 'weekly' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              >
                {isRtl ? 'أسبوعي' : 'Weekly'}
              </button>
              <button
                type="button"
                onClick={() => handleSubscriptionTypeChange('monthly')}
                className={`px-4 py-2 text-sm font-medium ${isRtl ? 'font-cairo' : ''} ${subscriptionType === 'monthly' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              >
                {isRtl ? 'شهري' : 'Monthly'}
              </button>
              <button
                type="button"
                onClick={() => handleSubscriptionTypeChange('yearly')}
                className={`px-4 py-2 text-sm font-medium ${isRtl ? 'rounded-l-md font-cairo' : 'rounded-r-md'} ${subscriptionType === 'yearly' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              >
                {isRtl ? 'سنوي' : 'Yearly'}
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : subscriptionPlans.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center max-w-lg mx-auto">
              <p className="text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl ? 'لا توجد خطط اشتراك متاحة حالياً' : 'No subscription plans available at the moment'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              {subscriptionPlans.map((plan, index) => {
                // Parse features
                let features = [];
                try {
                  if (typeof plan.features === 'string') {
                    const parsedFeatures = JSON.parse(plan.features);
                    if (Array.isArray(parsedFeatures)) {
                      if (parsedFeatures.length > 0 && parsedFeatures[0] && typeof parsedFeatures[0] === 'object') {
                        features = parsedFeatures;
                      } else {
                        features = parsedFeatures.map(feature => ({
                          en: String(feature),
                          ar: String(feature)
                        }));
                      }
                    }
                  } else if (Array.isArray(plan.features)) {
                    features = plan.features;
                  }
                } catch (error) {
                  console.error('Error parsing plan features:', error);
                }
                
                // Get price based on selected type
                let price;
                switch (subscriptionType) {
                  case 'weekly':
                    price = parseFloat(plan.price_weekly) || parseFloat(plan.price_monthly) / 4 || 0;
                    break;
                  case 'monthly':
                    price = parseFloat(plan.price_monthly) || 0;
                    break;
                  case 'yearly':
                  default:
                    price = parseFloat(plan.price_yearly) || 0;
                    break;
                }
                
                const isPopular = index === 1; // Mark the second plan as popular
                
                return (
                  <div key={plan.id} className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-t-4 ${isPopular ? 'border-t-blue-500' : 'border-t-transparent'} transition-all transform hover:-translate-y-1 hover:shadow-xl flex flex-col h-full mt-5 overflow-visible`}>
                    {isPopular && (
                      <div className="absolute -top-4 left-0 right-0 mx-auto w-max px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-full shadow-xl font-cairo transform transition-transform hover:scale-105 z-50 border-2 border-blue-400/40">
                        {isRtl ? (
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="inline-block text-center font-bold">الأكثر شعبية</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="inline-block text-center font-bold">Most Popular</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} justify-between items-start mb-4`}>
                      <h3 className="text-xl font-bold font-cairo text-gray-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                        {subscriptionType === 'yearly'
                          ? isRtl ? 'سنوي' : 'Yearly'
                          : subscriptionType === 'monthly'
                            ? isRtl ? 'شهري' : 'Monthly'
                            : isRtl ? 'أسبوعي' : 'Weekly'}
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      {isRtl ? (
                        <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-4 px-3 rounded-lg shadow-inner border border-gray-100 dark:border-gray-700">
                          <span className="text-4xl font-bold font-cairo bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                            {price.toFixed(2)}
                          </span>
                          <CurrencySymbol className="mx-1 text-2xl font-bold text-blue-600 dark:text-blue-400" />
                          <span className="text-lg font-cairo text-gray-500 dark:text-gray-400 mr-1">
                            /{subscriptionType === 'weekly' 
                              ? 'أسبوع'
                              : subscriptionType === 'monthly'
                                ? 'شهر'
                                : 'سنة'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-4 px-3 rounded-lg shadow-inner border border-gray-100 dark:border-gray-700">
                          <CurrencySymbol className="mx-1 text-2xl font-bold text-blue-600 dark:text-blue-400" />
                          <span className="text-4xl font-bold font-cairo bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                            {price.toFixed(2)}
                          </span>
                          <span className="text-lg font-cairo text-gray-500 dark:text-gray-400 ml-1">
                            /{subscriptionType === 'weekly' 
                              ? 'week'
                              : subscriptionType === 'monthly'
                                ? 'month'
                                : 'year'}
                          </span>
                        </div>
                      )}

                      {subscriptionType === 'yearly' && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-cairo text-center">
                          {isRtl ? 'وفر 16% مقارنة بالاشتراك الشهري' : 'Save 16% compared to monthly'}
                        </p>
                      )}
                    </div>
                    
                    <div className="mb-6 flex-grow">
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg mb-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
                        <p className="text-gray-600 dark:text-gray-300 font-cairo leading-relaxed">
                          {plan.description}
                        </p>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 rtl:mr-0 rtl:ml-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-900 dark:text-white font-cairo text-lg">
                            {isRtl ? 'المميزات' : 'Features'}
                          </h4>
                        </div>
                        <ul className="space-y-3.5">
                          {features.map((feature, index) => (
                            <li key={index} className="flex items-start group transition-all duration-300 hover:translate-x-1 rtl:hover:-translate-x-1">
                              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 rtl:mr-0 rtl:ml-3 flex-shrink-0 mt-0.5 group-hover:bg-green-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-600 dark:text-green-400 group-hover:text-white transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 font-cairo group-hover:text-gray-900 dark:group-hover:text-white transition-colors">  
                                {isRtl ? (feature.ar || feature.en) : (feature.en || feature.ar)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-5">
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        className={`group relative w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-cairo transition-all duration-300 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''} flex items-center justify-center`}
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></span>
                        <span className="relative flex items-center">
                          {isRtl ? 'اختر الخطة' : 'Select Plan'}
                          <svg className={`w-4 h-4 ${isRtl ? 'mr-2 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M19 12H5m7 7l-7-7 7-7" : "M5 12h14m-7 7l7-7-7-7"} />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      
      {/* Enhanced CTA Section with 3D effects and animations */}
      <section className="relative py-24 overflow-hidden">
        {/* Enhanced animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 animate-gradient-shift"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%221%22%20fill%3D%22%23fff%22%20fill-opacity%3D%220.15%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] opacity-20"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 rtl:right-auto rtl:left-20 w-64 h-64 rounded-full bg-gradient-to-r from-cyan-400/30 to-blue-500/30 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 rtl:left-auto rtl:right-10 w-40 h-40 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-2xl animate-pulse" style={{animationDuration: '8s'}}></div>
        
        <div className="container relative mx-auto px-6 z-10">
          <div className="max-w-3xl mx-auto text-center transform transition-all duration-700 hover:scale-[1.02]">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 mb-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 rtl:mr-0 rtl:ml-2 animate-pulse"></span>
              <span className="text-sm font-medium text-white font-cairo">
                {isRtl ? 'عرض محدود' : 'Limited Time Offer'}
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white font-cairo drop-shadow-md">
              {isRtl ? 'جاهز لتنمية أعمالك مع بوتات واتساب؟' : 'Ready to Grow Your Business with WhatsApp Bots?'}
            </h2>
            <p className="text-xl mb-10 text-blue-100 font-cairo max-w-2xl mx-auto leading-relaxed">
              {isRtl
                ? 'ابدأ اليوم وشاهد كيف يمكن لبوتات واتساب المتقدمة أن تحول تفاعلات عملائك وتعزز مبيعاتك.'
                : 'Start today and see how advanced WhatsApp bots can transform your customer interactions and boost your sales.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-5 rtl:space-x-reverse">
              <Link href="/register" 
                className="group relative overflow-hidden py-4 px-10 rounded-xl bg-white font-bold shadow-xl hover:shadow-blue-500/25 transform hover:-translate-y-1 transition-all duration-300 inline-flex items-center justify-center">
                <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative flex items-center text-blue-700 font-cairo">
                  {isRtl ? 'ابدأ الآن' : 'Start Now'}
                  <svg className={`w-5 h-5 ${isRtl ? 'mr-2 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M19 12H5m7 7l-7-7 7-7" : "M5 12h14m-7 7l7-7-7-7"} />
                  </svg>
                </span>
              </Link>
              <a href="#plans" className="text-white hover:text-blue-100 underline decoration-2 underline-offset-4 font-medium transition-colors duration-300 font-cairo">
                {isRtl ? 'عرض الخطط' : 'View Plans'}
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>
      </main>
    </div>
  );
}