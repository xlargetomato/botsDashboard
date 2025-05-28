'use client';

import { createContext, useContext, useState, useEffect } from 'react';

// English translations
const enTranslations = {
  common: {
    welcome: 'Welcome to our application',
    theme: {
      light: 'Light Mode',
      dark: 'Dark Mode',
    },
    language: {
      en: 'English',
      ar: 'Arabic',
    },
    navigation: {
      home: 'Home',
      about: 'About',
      contact: 'Contact',
      features: 'Features',
      testimonials: 'Testimonials',
      pricing: 'Pricing',
      dashboard: 'Dashboard',
      docs: 'Docs',
    },
    admin: {
      dashboard: 'Admin Dashboard',
      adminPanel: 'Admin Panel',
      users: 'Users',
      payments: 'Payments',
      coupons: 'Coupons',
      statistics: 'Statistics',
      support: 'Support',
      overview: 'Overview',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      expiredAccounts: 'Expired Accounts',
      userGrowth: 'User Growth',
      subscriptionTrends: 'Subscription Trends',
      planDistribution: 'Plan Distribution',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      recentActivities: 'Recent Activities',
      activitiesDescription: 'Recent user activities will be displayed here.',
      quickActions: 'Quick Actions',
      manageUsers: 'Manage Users',
      viewPayments: 'View Payments',
      manageCoupons: 'Manage Coupons',
      viewStatistics: 'View Statistics',
      totalRevenue: 'Total Revenue',
      activeCoupons: 'Active Coupons',
      faq: {
        faqs: 'FAQs',
        manageFaqs: 'Manage FAQs',
        addNew: 'Add New FAQ',
        noFaqs: 'No FAQs found. Create your first FAQ!',
        question: 'Question',
        questionEn: 'Question (English)',
        questionAr: 'Question (Arabic)',
        answer: 'Answer',
        answerEn: 'Answer (English)',
        answerAr: 'Answer (Arabic)',
        orderIndex: 'Display Order',
        isActive: 'Active',
        editFaq: 'Edit FAQ',
        createFaq: 'Create New FAQ',
        deleteConfirmation: 'Are you sure you want to delete this FAQ?'
      },
      active: 'Active',
      inactive: 'Inactive',
      order: 'Order',
      cancel: 'Cancel',
      create: 'Create',
      update: 'Update',
      submitting: 'Submitting...',
      deleteConfirmation: 'Are you sure you want to delete this item?',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      forgotPassword: 'Forgot Password',
      rememberMe: 'Remember Me',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: 'Don\'t have an account?',
      createAccount: 'Create Account',
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      agreeTerms: 'I agree to the Terms and Conditions and Privacy Policy',
      verificationCode: 'Verification Code',
      verifyEmail: 'Verify Email',
      resendCode: 'Resend Code',
      didntReceiveCode: 'Didn\'t receive the code?',
      verificationSuccess: 'Verification Successful!',
      accountCreated: 'Your account has been successfully created.',
    },
    cta: {
      getStarted: 'Get Started',
      learnMore: 'Learn More',
    },
    client: {
      faq: {
        frequentlyAskedQuestions: 'Frequently Asked Questions',
        noFaqsAvailable: 'No FAQs available at the moment',
        loading: 'Loading FAQs...',
      },
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      passwordLength: 'Password must be at least 8 characters',
      passwordsDoNotMatch: 'Passwords do not match',
      mustAgreeTerms: 'You must agree to the terms and conditions',
      invalidVerificationCode: 'Invalid verification code',
    },
  },
};

// Arabic translations
const arTranslations = {
  common: {
    welcome: 'مرحبًا بكم في تطبيقنا',
    theme: {
      light: 'الوضع النهاري',
      dark: 'الوضع الليلي',
    },
    language: {
      en: 'الإنجليزية',
      ar: 'العربية',
    },
    navigation: {
      home: 'الرئيسية',
      about: 'من نحن',
      contact: 'اتصل بنا',
      features: 'الميزات',
      testimonials: 'الشهادات',
      pricing: 'التسعير',
      dashboard: 'لوحة التحكم',
      docs: 'دليل المستخدم',
    },
    admin: {
      dashboard: 'لوحة تحكم المشرف',
      adminPanel: 'لوحة المشرف',
      users: 'المستخدمين',
      payments: 'المدفوعات',
      coupons: 'الكوبونات',
      statistics: 'الإحصائيات',
      support: 'الدعم',
      overview: 'نظرة عامة',
      totalUsers: 'إجمالي المستخدمين',
      activeUsers: 'المستخدمين النشطين',
      expiredAccounts: 'الحسابات المنتهية',
      userGrowth: 'نمو المستخدمين',
      subscriptionTrends: 'اتجاهات الاشتراكات',
      planDistribution: 'توزيع الخطط',
      actions: 'إجراءات',
      edit: 'تعديل',
      delete: 'حذف',
      add: 'إضافة',
      search: 'بحث',
      filter: 'تصفية',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      role: 'الدور',
      status: 'الحالة',
      createdAt: 'تاريخ الإنشاء',
      updatedAt: 'تاريخ التحديث',
      recentActivities: 'الأنشطة الأخيرة',
      activitiesDescription: 'سيتم عرض أنشطة المستخدم الأخيرة هنا.',
      quickActions: 'إجراءات سريعة',
      manageUsers: 'إدارة المستخدمين',
      viewPayments: 'عرض المدفوعات',
      manageCoupons: 'إدارة الكوبونات',
      viewStatistics: 'عرض الإحصائيات',
      totalRevenue: 'إجمالي الإيرادات',
      activeCoupons: 'الكوبونات النشطة',
      faq: {
        faqs: 'الأسئلة الشائعة',
        manageFaqs: 'إدارة الأسئلة الشائعة',
        addNew: 'إضافة سؤال جديد',
        noFaqs: 'لم يتم العثور على أسئلة شائعة. أنشئ أول سؤال!',
        question: 'السؤال',
        questionEn: 'السؤال (بالإنجليزية)',
        questionAr: 'السؤال (بالعربية)',
        answer: 'الإجابة',
        answerEn: 'الإجابة (بالإنجليزية)',
        answerAr: 'الإجابة (بالعربية)',
        orderIndex: 'ترتيب العرض',
        isActive: 'نشط',
        editFaq: 'تعديل السؤال',
        createFaq: 'إنشاء سؤال جديد',
        deleteConfirmation: 'هل أنت متأكد من رغبتك في حذف هذا السؤال؟'
      },
      active: 'نشط',
      inactive: 'غير نشط',
      order: 'الترتيب',
      cancel: 'إلغاء',
      create: 'إنشاء',
      update: 'تحديث',
      submitting: 'جاري الإرسال...',
      deleteConfirmation: 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟',
    },
    auth: {
      login: 'تسجيل الدخول',
      register: 'تسجيل',
      logout: 'تسجيل الخروج',
      forgotPassword: 'نسيت كلمة المرور؟',
      rememberMe: 'تذكرني',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      dontHaveAccount: 'ليس لديك حساب؟',
      createAccount: 'إنشاء حساب',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      agreeTerms: 'أوافق على الشروط والأحكام وسياسة الخصوصية',
      verificationCode: 'رمز التحقق',
      verifyEmail: 'التحقق من البريد الإلكتروني',
      resendCode: 'إعادة إرسال',
      didntReceiveCode: 'لم تستلم الرمز؟',
      verificationSuccess: 'تم التحقق بنجاح!',
      accountCreated: 'تم إنشاء حسابك بنجاح.',
    },
    cta: {
      getStarted: 'ابدأ الآن',
      learnMore: 'اعرف المزيد',
    },
    client: {
      faq: {
        frequentlyAskedQuestions: 'الأسئلة الشائعة',
        noFaqsAvailable: 'لا توجد أسئلة شائعة متاحة حاليًا',
        loading: 'جاري تحميل الأسئلة الشائعة...',
      },
    },
    errors: {
      required: 'هذا الحقل مطلوب',
      invalidEmail: 'البريد الإلكتروني غير صالح',
      passwordLength: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
      passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
      mustAgreeTerms: 'يجب أن توافق على الشروط والأحكام',
      invalidVerificationCode: 'رمز التحقق غير صالح',
    },
  },
};

// Create a context for language settings
const LanguageContext = createContext(null);

// Provider component for language settings
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ar');
  
  // Function to change the language
  const changeLanguage = (lang) => {
    setLanguage(lang);
  };
  
  // Update document direction based on language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);
  
  // Get translations for the current language
  const getTranslations = () => {
    return language === 'ar' ? arTranslations : enTranslations;
  };
  
  // Translation function
  const t = (key) => {
    const keys = key.split('.');
    let value = getTranslations();
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback to key if translation not found
      }
    }
    
    return value;
  };
  
  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use translations
export function useTranslation() {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  
  return {
    t: context.t,
    i18n: {
      language: context.language,
      changeLanguage: context.changeLanguage
    }
  };
}
