'use client';

import { useTranslation } from '@/lib/i18n/config';
import { useTheme } from '@/lib/theme/ThemeContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language === 'ar';
  const [isLoaded, setIsLoaded] = useState(false);

  // Animation effect on page load
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`min-h-screen ${isRtl ? 'rtl' : 'ltr'} ${theme === 'dark' ? 'dark' : ''}`}>
      <main>
      {/* Hero Section with 3D Bot Effect */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Abstract Background - Using CSS gradients instead of images */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 opacity-90"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
        
        {/* Animated Circles */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-40 w-40 h-40 bg-blue-300 rounded-full opacity-10 animate-pulse"></div>
        
        <div className={`container relative mx-auto px-6 z-10 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 font-cairo leading-tight">
                {isRtl 
                  ? 'بوتات واتساب ذكية لنمو أعمالك'
                  : 'Intelligent WhatsApp Bots for Business Growth'}
              </h1>
              <p className="text-xl mb-8 text-blue-100 font-cairo max-w-lg">
                {isRtl
                  ? 'قم بأتمتة المحادثات وتعزيز تفاعل العملاء وزيادة المبيعات بواسطة بوتات واتساب المدعومة بالذكاء الاصطناعي.'
                  : 'Automate conversations, boost customer engagement, and increase sales with AI-powered WhatsApp bots.'}
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 rtl:space-x-reverse">
                <Link href="/register" 
                  className="py-4 px-8 rounded-full bg-white text-blue-700 text-center font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                  {t('common.cta.getStarted')}
                </Link>
                <a href="#features" 
                  className="py-4 px-8 rounded-full bg-transparent border-2 border-white text-white text-center hover:bg-white/10 transition-colors">
                  {t('common.cta.learnMore')}
                </a>
              </div>
            </div>
            
{/* 3D Phone Mockup with WhatsApp Bot - Enhanced version with Arabic support */}
<div className="relative hidden lg:block">
  <div className={`relative transform rotate-12 hover:rotate-6 transition-all duration-500 ${isLoaded ? 'translate-y-0' : 'translate-y-12'}`}>
    <div className="w-80 h-[500px] bg-gray-900 rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 mx-auto">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[32px] h-full overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="px-4 py-3 bg-green-600 flex items-center space-x-3 rtl:space-x-reverse rounded-t-[32px]">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.035-.691-.1-1.02A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-white font-semibold text-lg">
            {isRtl ? 'بوت واتساب الذكي' : 'Smart WhatsApp Bot'}
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-[linear-gradient(rgba(229,221,213,0.9),rgba(229,221,213,0.9))] dark:bg-[linear-gradient(rgba(32,44,51,0.8),rgba(32,44,51,0.8))] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20opacity%3D%220.05%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22white%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2225%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E')] flex-1 p-4 overflow-y-auto space-y-4">

          {/* User message */}
          <div className="rounded-lg bg-green-100 p-3 ml-auto rtl:mr-auto rtl:ml-0 w-4/5 shadow">
            <p className="text-sm text-gray-800">
              {isRtl
                ? 'هل يمكنني تخصيص الردود الآلية حسب نوع العملاء؟'
                : 'Can I customize the auto-replies based on customer type?'}
            </p>
            <p className="text-xs text-gray-500 text-right rtl:text-left mt-1">
              {isRtl ? 'عميل • 9:01 ص' : 'Customer • 9:01 AM'}
            </p>
          </div>

          {/* Bot message */}
          <div className="rounded-lg bg-white p-3 shadow mr-auto rtl:ml-auto rtl:mr-0 w-4/5">
            <p className="text-sm text-gray-800">
              {isRtl
                ? 'نعم، يمكنك تخصيص الردود بالكامل، وإضافة سيناريوهات متعددة حسب طلبك، بدون الحاجة لأي خبرة تقنية.'
                : 'Yes, you can fully customize the replies and create multiple scenarios based on your needs—no technical skills required.'}
            </p>
            <p className="text-xs text-gray-500 text-right rtl:text-left mt-1">
              {isRtl ? 'البوت • 9:02 ص' : 'Bot • 9:02 AM'}
            </p>
          </div>

          {/* Typing indicator */}
          <div className="rounded-lg bg-white p-3 shadow w-24 mr-auto rtl:ml-auto rtl:mr-0">
            <div className="flex space-x-1 rtl:space-x-reverse">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-gray-800 text-gray-400 text-xs text-center rounded-b-[32px]">
          {isRtl
            ? 'بوتات واتساب قابلة للتخصيص بالكامل حسب مجالك — سهلة وسريعة'
            : 'Fully customizable WhatsApp bots for your niche — fast & easy to use'}
        </div>
      </div>
    </div>

    {/* Glow background */}
    <div className="absolute -z-10 top-10 left-10 right-10 bottom-10 bg-blue-500/20 rounded-[40px] blur-xl"></div>
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

{/* Stats Section - Updated with Features */}
<section className="py-12 bg-white dark:bg-gray-900">
  <div className="container mx-auto px-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      <div className="p-6 transform hover:scale-105 transition-transform">
        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">24/7</div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">{isRtl ? 'متاح دائماً' : 'Always Available'}</p>
      </div>
      <div className="p-6 transform hover:scale-105 transition-transform">
        <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">{isRtl ? 'قابل للتخصيص' : 'Customizable'}</p>
      </div>
      <div className="p-6 transform hover:scale-105 transition-transform">
        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">{isRtl ? 'آمن' : 'Secure'}</p>
      </div>
      <div className="p-6 transform hover:scale-105 transition-transform">
        <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-cairo">{isRtl ? 'سريع' : 'Fast'}</p>
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

      {/* CTA Section - Improved with animated gradient */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 animate-gradient-shift"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
        
        <div className="container relative mx-auto px-6 z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-white font-cairo">
              {isRtl ? 'جاهز لتنمية أعمالك مع بوتات واتساب؟' : 'Ready to Grow Your Business with WhatsApp Bots?'}
            </h2>
            <p className="text-xl mb-10 text-blue-100 font-cairo">
              {isRtl
                ? 'ابدأ اليوم وشاهد كيف يمكن لبوتات واتساب المتقدمة أن تحول تفاعلات عملائك وتعزز مبيعاتك.'
                : 'Start today and see how advanced WhatsApp bots can transform your customer interactions and boost your sales.'}
            </p>
            <Link href="/register" 
              className="py-4 px-10 rounded-full bg-white text-blue-700 font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 inline-block">
              {isRtl ? 'ابدأ مجانًا' : 'Start for Free'}
            </Link>
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